import crypto from "crypto";
import { Types } from "mongoose";
import User from "@modules/auth/auth.model";
import { IUserDocument } from "@app-types/index";

// =============================================================================
// Auth Repository
// =============================================================================
// Single responsibility: all database operations for the User collection.
// No business logic. No HTTP concepts. Pure data access.
//
// Service layer calls these methods — it never touches User model directly.
// =============================================================================

const authRepository = {

  // ─── CREATE ───────────────────────────────────────────────────────────────────

  /**
   * Creates a new user document.
   * Password hashing happens in the pre-save hook — do NOT hash before calling this.
   */
  async create(data: {
    name: string;
    email: string;
    password: string;
  }): Promise<IUserDocument> {
    const user = new User(data);
    await user.save();
    return user;
  },

  // ─── READ ─────────────────────────────────────────────────────────────────────

  /**
   * Find user by email.
   * Default: password excluded (select: false on schema).
   * Pass withPassword: true only for login — the only time we need it.
   */
  async findByEmail(
    email: string,
    withPassword: boolean = false
  ): Promise<IUserDocument | null> {
    const query = User.findOne({ email: email.toLowerCase() });

    if (withPassword) {
      query.select("+password");
    }

    return query.exec();
  },

  /**
   * Find user by MongoDB ObjectId.
   * Used after JWT verification — the token contains userId.
   */
  async findById(
    id: string | Types.ObjectId
  ): Promise<IUserDocument | null> {
    return User.findById(id).exec();
  },

  /**
   * Find user by email verification token.
   *
   * The raw token arrives in the URL param.
   * We hash it here to compare against the stored hash.
   * Also checks that the token hasn't expired.
   */
  async findByEmailVerificationToken(
    rawToken: string
  ): Promise<IUserDocument | null> {
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    return User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpiry: { $gt: new Date() }, // Not expired
    })
      .select("+emailVerificationToken +emailVerificationExpiry")
      .exec();
  },

  /**
   * Find user by password reset token.
   *
   * Same hash-compare pattern as email verification.
   * Also validates expiry — reset tokens expire in 10 minutes.
   */
  async findByPasswordResetToken(
    rawToken: string
  ): Promise<IUserDocument | null> {
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    return User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpiry: { $gt: new Date() }, // Not expired
    })
      .select("+passwordResetToken +passwordResetExpiry")
      .exec();
  },

  /**
   * Find user by hashed refresh token.
   * Used in the refresh-token flow to validate the cookie.
   *
   * We receive the raw token from the cookie, hash it, then query.
   */
  async findByRefreshToken(
    rawToken: string
  ): Promise<IUserDocument | null> {
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    return User.findOne({ refreshToken: hashedToken })
      .select("+refreshToken")
      .exec();
  },

  // ─── UPDATE ───────────────────────────────────────────────────────────────────

  /**
   * Save a document after mutating it in the service layer.
   * Triggers pre-save hooks (e.g. password re-hashing if modified).
   *
   * Usage in service:
   *   user.name = 'New Name'
   *   await authRepository.save(user)
   */
  async save(user: IUserDocument): Promise<IUserDocument> {
    return user.save();
  },

  /**
   * Mark email as verified and activate the account.
   * Clears the verification token fields — they're single-use.
   */
  async verifyEmail(userId: string | Types.ObjectId): Promise<IUserDocument | null> {
    return User.findByIdAndUpdate(
      userId,
      {
        $set: { isEmailVerified: true, status: "active" },
        $unset: {
          emailVerificationToken: "",
          emailVerificationExpiry: "",
        },
      },
      { new: true } // Return the updated document
    ).exec();
  },

  /**
   * Store a hashed refresh token on the user document.
   * Called after login or token refresh.
   * Raw token goes into cookie — hash stored in DB.
   */
  async setRefreshToken(
    userId: string | Types.ObjectId,
    rawToken: string
  ): Promise<void> {
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    await User.findByIdAndUpdate(userId, {
      $set: { refreshToken: hashedToken },
    }).exec();
  },

  /**
   * Clear the refresh token on logout.
   * After this, the old cookie is worthless even if an attacker has it.
   */
  async clearRefreshToken(userId: string | Types.ObjectId): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      $unset: { refreshToken: "" },
    }).exec();
  },

  /**
   * Update user's password.
   * Saves directly with the new hashed value — pre-save hook handles hashing
   * when we do user.password = newPassword; await user.save()
   * But this findByIdAndUpdate version bypasses hooks, so we accept
   * a pre-hashed password here for bulk/admin resets.
   *
   * For user-initiated resets: use save() on the document instead.
   */
  async updatePassword(
    userId: string | Types.ObjectId,
    hashedPassword: string
  ): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      $set: { password: hashedPassword },
      $unset: {
        passwordResetToken: "",
        passwordResetExpiry: "",
      },
    }).exec();
  },

  /**
   * Generic field update for a user document.
   * Used for profile updates, avatar changes, etc.
   * Returns the updated document.
   */
  async updateById(
    userId: string | Types.ObjectId,
    updates: Partial<IUserDocument>
  ): Promise<IUserDocument | null> {
    return User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).exec();
  },

  // ─── EXISTS CHECK ─────────────────────────────────────────────────────────────

  /**
   * Check if a user exists with the given email.
   * Uses countDocuments which is faster than findOne (no document hydration).
   * Used in register to check for duplicates before creation.
   */
  async existsByEmail(email: string): Promise<boolean> {
    const count = await User.countDocuments({
      email: email.toLowerCase(),
    }).exec();
    return count > 0;
  },
};

export default authRepository;
