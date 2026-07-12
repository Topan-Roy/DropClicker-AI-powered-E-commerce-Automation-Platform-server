import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { IUserDocument } from "@app-types/index";
import {
  ROLES,
  ACCOUNT_STATUS,
  BCRYPT_ROUNDS,
  TOKEN_EXPIRY,
} from "@constants/index";

// =============================================================================
// User Schema
// =============================================================================

const userSchema = new Schema<IUserDocument>(
  {
    // ─── Core Identity ──────────────────────────────────────────────────────────
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,         // Creates a MongoDB index — enforces uniqueness at DB level
      lowercase: true,      // Normalize to lowercase before saving
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid email address",
      ],
    },

    // select: false — never returned in queries by default
    // Must use .select('+password') explicitly when needed (login check)
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },

    // ─── Role & Status ──────────────────────────────────────────────────────────
    role: {
      type: String,
      enum: {
        values: Object.values(ROLES),
        message: "Invalid role: {VALUE}",
      },
      default: ROLES.USER,
    },

    status: {
      type: String,
      enum: {
        values: Object.values(ACCOUNT_STATUS),
        message: "Invalid status: {VALUE}",
      },
      default: ACCOUNT_STATUS.PENDING, // All accounts start pending until email verified
    },

    // ─── Profile ────────────────────────────────────────────────────────────────
    avatar: {
      type: String,
      default: null,
    },

    // ─── Email Verification ─────────────────────────────────────────────────────
    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    // Stored as SHA-256 hash — raw token is sent by email
    emailVerificationToken: {
      type: String,
      select: false,
    },

    emailVerificationExpiry: {
      type: Date,
      select: false,
    },

    // ─── Password Reset ─────────────────────────────────────────────────────────
    // Stored as SHA-256 hash — raw token is sent by email
    passwordResetToken: {
      type: String,
      select: false,
    },

    passwordResetExpiry: {
      type: Date,
      select: false,
    },

    // ─── Refresh Token ───────────────────────────────────────────────────────────
    // Stored as SHA-256 hash — raw token goes into httpOnly cookie
    // Invalidated on logout, rotated on every refresh
    refreshToken: {
      type: String,
      select: false,
    },
  },
  {
    // Automatically adds createdAt and updatedAt fields
    timestamps: true,

    // Remove __v (Mongoose version key) from responses — not useful to clients
    versionKey: false,

    // Custom toJSON transform — strips sensitive fields when serializing
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret["password"] = undefined;
        ret["emailVerificationToken"] = undefined;
        ret["emailVerificationExpiry"] = undefined;
        ret["passwordResetToken"] = undefined;
        ret["passwordResetExpiry"] = undefined;
        ret["refreshToken"] = undefined;
        return ret;
      },
    },
  }
);

// =============================================================================
// Indexes
// =============================================================================

// Compound index for token lookups (verify email, reset password)
// TTL index automatically deletes expired verification tokens from the DB
userSchema.index(
  { emailVerificationExpiry: 1 },
  { expireAfterSeconds: 0, sparse: true }
);
userSchema.index(
  { passwordResetExpiry: 1 },
  { expireAfterSeconds: 0, sparse: true }
);

// =============================================================================
// Pre-Save Hook — Password Hashing
// =============================================================================

/**
 * Only re-hash if the password field was actually modified.
 * Without this check, saving any other field (e.g. name) would re-hash
 * the already-hashed password, making future login comparisons fail.
 */
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, BCRYPT_ROUNDS);
});

// =============================================================================
// Instance Methods
// =============================================================================

/**
 * comparePassword
 * Compares a plain-text candidate password against the stored bcrypt hash.
 *
 * Usage in auth service:
 *   const isMatch = await user.comparePassword(req.body.password)
 */
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  // `this.password` may be undefined if select: false was not overridden.
  // The repository must use .select('+password') when fetching for login.
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * generateEmailVerificationToken
 *
 * 1. Generates a cryptographically secure random token (32 bytes = 64 hex chars)
 * 2. Hashes it with SHA-256 and stores the hash in the document
 * 3. Sets an expiry (24 hours from now)
 * 4. Returns the RAW token — caller must save the document and email this token
 *
 * Security: only the hash is stored. If the DB is breached,
 * the attacker cannot verify emails with the hash alone.
 */
userSchema.methods.generateEmailVerificationToken = function (): string {
  // Raw token — goes into the email link
  const rawToken = crypto.randomBytes(32).toString("hex");

  // Store the SHA-256 hash — never store the raw token
  this.emailVerificationToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  // Expires in 24 hours
  this.emailVerificationExpiry = new Date(Date.now() + TOKEN_EXPIRY.EMAIL_VERIFICATION);

  return rawToken;
};

/**
 * generatePasswordResetToken
 *
 * Same pattern as above but with a 10-minute expiry.
 * The short window limits the blast radius if a reset email is intercepted.
 */
userSchema.methods.generatePasswordResetToken = function (): string {
  const rawToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  // Expires in 10 minutes
  this.passwordResetExpiry = new Date(Date.now() + TOKEN_EXPIRY.PASSWORD_RESET);

  return rawToken;
};

// =============================================================================
// Model Export
// =============================================================================

const User = mongoose.model<IUserDocument>("User", userSchema);

export default User;
