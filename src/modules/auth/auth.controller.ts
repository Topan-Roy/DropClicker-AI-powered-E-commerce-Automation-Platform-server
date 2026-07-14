import { Request, Response } from "express";
import authService from "@modules/auth/auth.service";
import ApiResponse from "@utils/ApiResponse";
import ApiError from "@utils/ApiError";
import {
  getRefreshTokenCookieOptions,
  getClearRefreshTokenCookieOptions,
} from "@utils/tokenHelper";
import { COOKIE_NAMES, HTTP_STATUS } from "@constants/index";
import authRepository from "@modules/auth/auth.repository";
import type {
  RegisterInput,
  LoginInput,
  ResetPasswordInput,
  ChangePasswordInput,
} from "@modules/auth/auth.schema";

// =============================================================================
// Auth Controller
// =============================================================================
// HTTP adapter only. Extracts from req → calls service → sends res.
// All methods are wrapped with asyncHandler in the routes file.
// No try/catch here — asyncHandler forwards any thrown error to the
// global error middleware.
// =============================================================================

const authController = {

  // ─── POST /auth/register ───────────────────────────────────────────────────

  /**
   * Register a new user account.
   * Returns 201 with the created user (no tokens — must verify email first).
   */
  async register(req: Request, res: Response): Promise<void> {
    const body = req.body as RegisterInput;

    const result = await authService.register(body);

    new ApiResponse(
      HTTP_STATUS.CREATED,
      result,
      "Account created successfully. Please check your email to verify your account."
    ).send(res);
  },

  // ─── POST /auth/login ──────────────────────────────────────────────────────

  /**
   * Log in and issue access + refresh tokens.
   *
   * - Access token → response body (frontend stores in memory)
   * - Refresh token → httpOnly cookie (browser stores automatically)
   *
   * Why this split?
   *   Storing access token in memory (JS variable) means XSS can't steal it
   *   across page refreshes but it survives within the session.
   *   The refresh token in httpOnly cookie is XSS-proof and auto-sent.
   */
  async login(req: Request, res: Response): Promise<void> {
    const body = req.body as LoginInput;

    const { user, tokens } = await authService.login(body);

    // Set refresh token in httpOnly cookie
    res.cookie(
      COOKIE_NAMES.REFRESH_TOKEN,
      tokens.refreshToken,
      getRefreshTokenCookieOptions()
    );

    new ApiResponse(
      HTTP_STATUS.OK,
      {
        user,
        accessToken: tokens.accessToken,
        // Never send refreshToken in response body — it's in the cookie
      },
      "Login successful"
    ).send(res);
  },

  // ─── POST /auth/logout ─────────────────────────────────────────────────────

  /**
   * Log out the current user.
   *
   * Two-step invalidation:
   *  1. Clear refresh token from DB (server-side invalidation)
   *  2. Clear the cookie (client-side cleanup)
   *
   * Even if the client ignores the Set-Cookie header,
   * the DB token is gone so the cookie is useless.
   */
  async logout(req: Request, res: Response): Promise<void> {
    // req.user is set by authenticate middleware
    const userId = req.user!.userId;

    await authService.logout(userId);

    // Clear the cookie by setting maxAge to 0
    res.clearCookie(
      COOKIE_NAMES.REFRESH_TOKEN,
      getClearRefreshTokenCookieOptions()
    );

    new ApiResponse(HTTP_STATUS.OK, null, "Logged out successfully").send(res);
  },

  // ─── POST /auth/refresh-token ──────────────────────────────────────────────

  /**
   * Issue a new access token using the refresh token cookie.
   *
   * The refresh token comes from the httpOnly cookie — not from the body.
   * This is why the cookie path is set to /api/v1/auth (only sent to auth routes).
   */
  async refreshToken(req: Request, res: Response): Promise<void> {
    const rawRefreshToken = req.cookies?.[COOKIE_NAMES.REFRESH_TOKEN] as
      | string
      | undefined;

    if (!rawRefreshToken) {
      throw ApiError.unauthorized(
        "Refresh token not found. Please log in again."
      );
    }

    const { tokens, user } = await authService.refreshTokens(rawRefreshToken);

    // Rotate: set the new refresh token cookie
    res.cookie(
      COOKIE_NAMES.REFRESH_TOKEN,
      tokens.refreshToken,
      getRefreshTokenCookieOptions()
    );

    new ApiResponse(
      HTTP_STATUS.OK,
      {
        user,
        accessToken: tokens.accessToken,
      },
      "Token refreshed successfully"
    ).send(res);
  },

  // ─── GET /auth/verify-email/:token ────────────────────────────────────────

  /**
   * Verify email address using the token from the verification email link.
   * The token is in the URL param, not the body.
   */
  async verifyEmail(req: Request, res: Response): Promise<void> {
    const token = req.params["token"] as string;

    const result = await authService.verifyEmail(token);

    new ApiResponse(
      HTTP_STATUS.OK,
      result,
      "Email verified successfully. Your account is now active."
    ).send(res);
  },

  // ─── POST /auth/resend-verification ───────────────────────────────────────

  /**
   * Resend the email verification link.
   * Always returns the same message regardless of whether the email exists
   * (anti-enumeration).
   */
  async resendVerification(req: Request, res: Response): Promise<void> {
    const { email } = req.body as { email: string };

    await authService.resendVerificationEmail(email);

    new ApiResponse(
      HTTP_STATUS.OK,
      null,
      "If that email is registered and unverified, a new verification link has been sent."
    ).send(res);
  },

  // ─── POST /auth/forgot-password ───────────────────────────────────────────

  /**
   * Initiate password reset flow.
   * Always returns the same message — never reveals if the email exists.
   */
  async forgotPassword(req: Request, res: Response): Promise<void> {
    const { email } = req.body as { email: string };

    await authService.forgotPassword(email);

    new ApiResponse(
      HTTP_STATUS.OK,
      null,
      "If that email is registered, a password reset link has been sent."
    ).send(res);
  },

  // ─── POST /auth/reset-password/:token ─────────────────────────────────────

  /**
   * Reset password using the token from the reset email.
   * Token is in URL param. New password is in the body.
   * After reset, all sessions are invalidated (refresh token cleared).
   */
  async resetPassword(req: Request, res: Response): Promise<void> {
    const token = req.params["token"] as string;
    const body = req.body as ResetPasswordInput;

    await authService.resetPassword(token, body);

    // Clear the refresh token cookie — force re-login after password reset
    res.clearCookie(
      COOKIE_NAMES.REFRESH_TOKEN,
      getClearRefreshTokenCookieOptions()
    );

    new ApiResponse(
      HTTP_STATUS.OK,
      null,
      "Password reset successfully. Please log in with your new password."
    ).send(res);
  },

  // ─── PATCH /auth/change-password ──────────────────────────────────────────

  /**
   * Change password for an authenticated user.
   * Requires current password to prevent unauthorized changes
   * if a device is left logged in.
   */
  async changePassword(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const body = req.body as ChangePasswordInput;

    await authService.changePassword(userId, body);

    // Clear refresh token — force re-login after password change
    res.clearCookie(
      COOKIE_NAMES.REFRESH_TOKEN,
      getClearRefreshTokenCookieOptions()
    );

    new ApiResponse(
      HTTP_STATUS.OK,
      null,
      "Password changed successfully. Please log in with your new password."
    ).send(res);
  },

  // ─── GET /auth/me ──────────────────────────────────────────────────────────

  /**
   * Return the authenticated user's profile.
   * Protected route — requires a valid access token.
   * Used by the frontend to hydrate the current user on app load.
   */
  async getMe(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;

    const result = await authService.getMe(userId);

    new ApiResponse(HTTP_STATUS.OK, result, "User profile retrieved").send(res);
  },

  // ─── PATCH /auth/update-profile ────────────────────────────────────────────

  /**
   * Update authenticated user's profile (name + avatar URL).
   * Only allows updating safe fields — not role, status, or password.
   */
  async updateProfile(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { name, avatar } = req.body;

    const allowedUpdates: Record<string, unknown> = {};
    if (name) allowedUpdates.name = name;
    if (avatar !== undefined) allowedUpdates.avatar = avatar;

    const updatedUser = await authRepository.updateById(userId, allowedUpdates as any);

    if (!updatedUser) {
      throw ApiError.notFound("User not found");
    }

    new ApiResponse(HTTP_STATUS.OK, { user: updatedUser }, "Profile updated successfully").send(res);
  },
};

export default authController;
