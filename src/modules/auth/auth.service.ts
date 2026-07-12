import bcrypt from "bcryptjs";
import authRepository from "@modules/auth/auth.repository";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "@utils/tokenHelper";
import sendEmail, {
  emailVerificationTemplate,
  passwordResetTemplate,
} from "@utils/sendEmail";
import ApiError from "@utils/ApiError";
import logger from "@config/logger.config";
import { env } from "@config/env.config";
import { ACCOUNT_STATUS, BCRYPT_ROUNDS } from "@constants/index";
import { IAuthTokens, IUserPublic } from "@app-types/index";
import type {
  RegisterInput,
  LoginInput,
  ResetPasswordInput,
  ChangePasswordInput,
} from "@modules/auth/auth.schema";

// =============================================================================
// Auth Service
// =============================================================================
// Pure business logic. No req/res. No HTTP status codes.
// Throws ApiError for expected failures — the global error handler sends
// the appropriate HTTP response.
//
// Flow for every method:
//   1. Validate business rules (not Zod — that's done before this layer)
//   2. Call repository for data access
//   3. Apply transformations / side effects (emails, token generation)
//   4. Return a clean result to the controller
// =============================================================================

const authService = {

  // ─── REGISTER ────────────────────────────────────────────────────────────────

  /**
   * Register a new user.
   *
   * Flow:
   *  1. Check if email is already taken
   *  2. Create the user (password hashed by pre-save hook)
   *  3. Generate email verification token
   *  4. Send verification email
   *  5. Return the public user object (no tokens — not logged in yet)
   *
   * Design: We do NOT auto-login after register. The user must verify
   * their email first. This prevents throwaway accounts from clogging the system.
   */
  async register(data: RegisterInput): Promise<{ user: IUserPublic }> {
    const { name, email, password } = data;

    // 1. Duplicate email check
    const exists = await authRepository.existsByEmail(email);
    if (exists) {
      throw ApiError.conflict(
        "An account with this email already exists. Please log in or use a different email."
      );
    }

    // 2. Create user — pre-save hook hashes the password
    const user = await authRepository.create({ name, email, password });

    // 3. Generate verification token (raw token returned, hash stored on document)
    const rawToken = user.generateEmailVerificationToken();
    await authRepository.save(user); // Persist the hashed token + expiry

    // 4. Build the verification URL and send email
    const verifyUrl = `${env.CLIENT_URL}/auth/verify-email/${rawToken}`;

    try {
      await sendEmail({
        to: user.email,
        subject: "Verify your DropClicker account",
        html: emailVerificationTemplate(verifyUrl, user.name),
      });
      logger.info("Verification email sent", { userId: user._id, email: user.email });
    } catch (emailError) {
      // Email failed — still allow registration but log the failure.
      // User can request a new verification email later.
      logger.error("Failed to send verification email after registration", {
        userId: user._id,
        error: emailError instanceof Error ? emailError.message : emailError,
      });
    }

    // 5. Return safe public user (toJSON transform strips sensitive fields)
    return { user: sanitizeUser(user) };
  },

  // ─── LOGIN ────────────────────────────────────────────────────────────────────

  /**
   * Authenticate a user and issue access + refresh tokens.
   *
   * Flow:
   *  1. Find user by email (with password — only time we need it)
   *  2. Compare password with bcrypt
   *  3. Check account status (suspended/inactive users cannot log in)
   *  4. Generate access token + refresh token
   *  5. Store hashed refresh token in DB
   *  6. Return tokens + public user
   *
   * Security: We give the SAME error for "email not found" and "wrong password"
   * to prevent email enumeration attacks.
   */
  async login(
    data: LoginInput
  ): Promise<{ user: IUserPublic; tokens: IAuthTokens }> {
    const { email, password } = data;

    // 1. Fetch user with password (select: false on schema, must opt-in)
    const user = await authRepository.findByEmail(email, true);

    // Same error message for "not found" and "wrong password"
    if (!user) {
      throw ApiError.unauthorized("Invalid email or password");
    }

    // 2. Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw ApiError.unauthorized("Invalid email or password");
    }

    // 3. Check account status
    if (user.status === ACCOUNT_STATUS.SUSPENDED) {
      throw ApiError.forbidden(
        "Your account has been suspended. Please contact support."
      );
    }

    if (user.status === ACCOUNT_STATUS.INACTIVE) {
      throw ApiError.forbidden(
        "Your account is inactive. Please contact support."
      );
    }

    // 4. Generate tokens
    const tokens = generateTokenPair(user._id.toString(), user.email, user.role);

    // 5. Store hashed refresh token
    await authRepository.setRefreshToken(user._id, tokens.refreshToken);

    logger.info("User logged in", { userId: user._id, email: user.email });

    return { user: sanitizeUser(user), tokens };
  },

  // ─── LOGOUT ───────────────────────────────────────────────────────────────────

  /**
   * Log out a user by invalidating their refresh token.
   *
   * Flow:
   *  1. Clear the refresh token from the DB
   *
   * The controller clears the cookie. Even if an attacker still has
   * the old cookie value, it's now worthless — the DB hash is gone.
   *
   * We do NOT invalidate the access token — it's short-lived (15min).
   * For immediate revocation needs, add a token blacklist (Redis).
   */
  async logout(userId: string): Promise<void> {
    await authRepository.clearRefreshToken(userId);
    logger.info("User logged out", { userId });
  },

  // ─── REFRESH TOKENS ───────────────────────────────────────────────────────────

  /**
   * Issue a new access token + refresh token using a valid refresh token.
   *
   * This implements Refresh Token Rotation:
   *   - Old refresh token is invalidated
   *   - New refresh token is issued and stored
   *   - New access token is issued
   *
   * Why rotation? If a refresh token is stolen and used, the legitimate user's
   * next refresh will fail (token already rotated), alerting them to the breach.
   * The server can then detect the reuse and invalidate ALL sessions for that user.
   *
   * Flow:
   *  1. Verify JWT signature of the refresh token
   *  2. Find user by the refresh token hash in DB
   *  3. Issue new token pair (rotation)
   *  4. Update stored hash
   */
  async refreshTokens(
    rawRefreshToken: string
  ): Promise<{ tokens: IAuthTokens; user: IUserPublic }> {
    // 1. Verify JWT — throws if expired or tampered
    const decoded = verifyRefreshToken(rawRefreshToken);

    // 2. Find user by refresh token hash (double validation)
    // This catches:
    //   - Tokens that were already rotated (reuse detection)
    //   - Tokens cleared on logout
    const user = await authRepository.findByRefreshToken(rawRefreshToken);

    if (!user) {
      // Refresh token reuse detected — this is a security event
      // In a high-security system, you'd revoke ALL refresh tokens for this user
      logger.warn("Refresh token reuse attempt detected", {
        userId: decoded.userId,
      });
      throw ApiError.unauthorized(
        "Refresh token is invalid or has already been used. Please log in again."
      );
    }

    // 3. Generate new token pair (rotation)
    const tokens = generateTokenPair(user._id.toString(), user.email, user.role);

    // 4. Store new hashed refresh token (old one is replaced)
    await authRepository.setRefreshToken(user._id, tokens.refreshToken);

    logger.info("Tokens refreshed", { userId: user._id });

    return { tokens, user: sanitizeUser(user) };
  },

  // ─── VERIFY EMAIL ─────────────────────────────────────────────────────────────

  /**
   * Verify a user's email address using the token from their email link.
   *
   * Flow:
   *  1. Hash the raw token and look up the user
   *  2. Mark the email as verified, set status to active
   *  3. Clear the verification token fields (single-use)
   */
  async verifyEmail(rawToken: string): Promise<{ user: IUserPublic }> {
    // 1. Find user by token (repository hashes it internally)
    const user = await authRepository.findByEmailVerificationToken(rawToken);

    if (!user) {
      throw ApiError.badRequest(
        "Email verification link is invalid or has expired. Please request a new one."
      );
    }

    // 2. Check not already verified
    if (user.isEmailVerified) {
      throw ApiError.badRequest("Email address is already verified.");
    }

    // 3. Verify and activate (repository clears token fields)
    const updatedUser = await authRepository.verifyEmail(user._id);

    if (!updatedUser) {
      throw ApiError.internal("Failed to verify email. Please try again.");
    }

    logger.info("Email verified", { userId: user._id, email: user.email });

    return { user: sanitizeUser(updatedUser) };
  },

  // ─── RESEND VERIFICATION EMAIL ────────────────────────────────────────────────

  /**
   * Resend the email verification link.
   * Called when the original link expired or was lost.
   *
   * Security: Always returns the same success message regardless of
   * whether the email exists — prevents email enumeration.
   */
  async resendVerificationEmail(email: string): Promise<void> {
    const user = await authRepository.findByEmail(email);

    // Silent return if user not found — no enumeration
    if (!user) return;

    // Silent return if already verified
    if (user.isEmailVerified) return;

    // Generate new token
    const rawToken = user.generateEmailVerificationToken();
    await authRepository.save(user);

    const verifyUrl = `${env.CLIENT_URL}/auth/verify-email/${rawToken}`;

    await sendEmail({
      to: user.email,
      subject: "Verify your DropClicker account",
      html: emailVerificationTemplate(verifyUrl, user.name),
    });

    logger.info("Verification email resent", { userId: user._id });
  },

  // ─── FORGOT PASSWORD ──────────────────────────────────────────────────────────

  /**
   * Initiate the password reset flow.
   *
   * Flow:
   *  1. Find user by email
   *  2. Generate a password reset token (10-minute expiry)
   *  3. Send reset email with the raw token in the URL
   *
   * Security: Always responds with the same message — never reveal
   * whether an email address exists in the system.
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await authRepository.findByEmail(email);

    // Silent return — prevents email enumeration
    if (!user) {
      logger.info("Forgot password requested for non-existent email", { email });
      return;
    }

    // Generate reset token (hash stored on user, raw returned)
    const rawToken = user.generatePasswordResetToken();
    await authRepository.save(user);

    const resetUrl = `${env.CLIENT_URL}/auth/reset-password/${rawToken}`;

    await sendEmail({
      to: user.email,
      subject: "Reset your DropClicker password",
      html: passwordResetTemplate(resetUrl, user.name),
    });

    logger.info("Password reset email sent", { userId: user._id });
  },

  // ─── RESET PASSWORD ───────────────────────────────────────────────────────────

  /**
   * Reset a user's password using the token from the reset email.
   *
   * Flow:
   *  1. Find user by the hashed reset token (validates expiry)
   *  2. Set new password directly on the document and save
   *     (pre-save hook re-hashes the new password)
   *  3. Clear reset token fields (single-use)
   *  4. Invalidate all existing sessions (clear refresh token)
   *
   * Step 4 is important: after a password reset, force re-login on all devices.
   * If an attacker obtained the reset link, they can't maintain a long-lived session.
   */
  async resetPassword(
    rawToken: string,
    data: ResetPasswordInput
  ): Promise<void> {
    // 1. Find user by token (repository hashes + checks expiry)
    const user = await authRepository.findByPasswordResetToken(rawToken);

    if (!user) {
      throw ApiError.badRequest(
        "Password reset link is invalid or has expired. Please request a new one."
      );
    }

    // 2. Set new password — pre-save hook handles hashing
    user.password = data.password;

    // 3 + 4. Clear reset fields and refresh token in one save
    user.passwordResetToken = undefined;
    user.passwordResetExpiry = undefined;
    user.refreshToken = undefined;

    await authRepository.save(user);

    logger.info("Password reset successfully", { userId: user._id });
  },

  // ─── CHANGE PASSWORD ──────────────────────────────────────────────────────────

  /**
   * Change password for an authenticated user.
   *
   * Flow:
   *  1. Fetch user with password
   *  2. Verify current password
   *  3. Set new password and save (pre-save hook hashes it)
   *  4. Invalidate refresh token — force re-login (optional but recommended)
   */
  async changePassword(
    userId: string,
    data: ChangePasswordInput
  ): Promise<void> {
    const { currentPassword, newPassword } = data;

    // 1. Fetch with password (select: false by default)
    const user = await authRepository.findByEmail(
      // Get email from userId first
      (await authRepository.findById(userId))?.email ?? "",
      true
    );

    if (!user) {
      throw ApiError.notFound("User not found");
    }

    // 2. Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      throw ApiError.badRequest("Current password is incorrect");
    }

    // 3. Set new password
    user.password = newPassword;
    user.refreshToken = undefined; // 4. Invalidate sessions

    await authRepository.save(user);

    logger.info("Password changed successfully", { userId });
  },

  // ─── GET CURRENT USER ─────────────────────────────────────────────────────────

  /**
   * Return the authenticated user's profile.
   * Called on /auth/me — requires valid access token.
   */
  async getMe(userId: string): Promise<{ user: IUserPublic }> {
    const user = await authRepository.findById(userId);

    if (!user) {
      throw ApiError.notFound("User not found");
    }

    return { user: sanitizeUser(user) };
  },
};

// =============================================================================
// Private Helpers
// =============================================================================

/**
 * Generates a matched access + refresh token pair.
 * Called after login and after token refresh.
 */
function generateTokenPair(
  userId: string,
  email: string,
  role: string
): IAuthTokens {
  const accessToken = generateAccessToken({ userId, email, role });
  const refreshToken = generateRefreshToken({ userId });
  return { accessToken, refreshToken };
}

/**
 * Strips sensitive fields from a user document for safe API responses.
 * The IUserDocument toJSON transform handles most of this, but we explicitly
 * cast to IUserPublic to enforce the TypeScript contract.
 */
function sanitizeUser(user: {
  _id: unknown;
  name: string;
  email: string;
  role: string;
  status: string;
  avatar?: string | null;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}): IUserPublic {
  return {
    _id: user._id as IUserPublic["_id"],
    name: user.name,
    email: user.email,
    role: user.role as IUserPublic["role"],
    status: user.status as IUserPublic["status"],
    avatar: user.avatar ?? undefined,
    isEmailVerified: user.isEmailVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export default authService;
