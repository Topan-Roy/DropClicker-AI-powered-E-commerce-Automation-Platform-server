import { Document, Types } from "mongoose";
import { TUserRole, TAccountStatus } from "@constants/index";

// =============================================================================
// DropClicker — Shared TypeScript Interfaces & Types
// =============================================================================

// ─── User ─────────────────────────────────────────────────────────────────────

/**
 * Plain user data shape (no Mongoose methods).
 * Used in services, controllers, and API responses.
 */
export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: TUserRole;
  status: TAccountStatus;
  avatar?: string;
  isEmailVerified: boolean;

  // One-time token fields — stored hashed in DB
  emailVerificationToken?: string;
  emailVerificationExpiry?: Date;
  passwordResetToken?: string;
  passwordResetExpiry?: Date;

  // Refresh token — stored hashed to prevent DB theft attacks
  refreshToken?: string;

  // Timestamps (added by Mongoose { timestamps: true })
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Mongoose document type — extends IUser with Mongoose instance methods.
 * Used only inside the model file and repository layer.
 *
 * Instance methods (defined in the schema):
 *   comparePassword(candidatePassword) — bcrypt compare
 *   generateEmailVerificationToken()   — crypto token + hashed storage
 *   generatePasswordResetToken()       — crypto token + hashed storage
 */
export interface IUserDocument extends IUser, Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateEmailVerificationToken(): string; // Returns raw token, stores hash
  generatePasswordResetToken(): string;     // Returns raw token, stores hash
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

/**
 * Shape returned after successful login/register.
 * The accessToken goes in the response body.
 * The refreshToken goes in an httpOnly cookie (handled by the controller).
 */
export interface IAuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Safe user object for API responses.
 * Never includes password, tokens, or hashed reset fields.
 */
export interface IUserPublic {
  _id: Types.ObjectId;
  name: string;
  email: string;
  role: TUserRole;
  status: TAccountStatus;
  avatar?: string;
  isEmailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Request Body Shapes ──────────────────────────────────────────────────────
// These mirror Zod schemas and are used to type req.body in controllers.

export interface IRegisterBody {
  name: string;
  email: string;
  password: string;
}

export interface ILoginBody {
  email: string;
  password: string;
}

export interface IForgotPasswordBody {
  email: string;
}

export interface IResetPasswordBody {
  password: string;
  confirmPassword: string;
}

export interface IChangePasswordBody {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
