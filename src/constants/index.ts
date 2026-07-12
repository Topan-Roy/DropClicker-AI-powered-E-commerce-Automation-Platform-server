// =============================================================================
// DropClicker — Application-Wide Constants
// =============================================================================
// Rule: Never use raw strings for roles, statuses, or config values in
// business logic. Always import from here so a rename is one-file change.
// =============================================================================

// ─── User Roles ───────────────────────────────────────────────────────────────
/**
 * All possible user roles in the system.
 * Used in JWT payload, Mongoose schema, and route-level authorization.
 */
export const ROLES = {
  USER: "user",         // Regular customer / store owner
  ADMIN: "admin",       // Platform administrator
  MODERATOR: "moderator", // Can manage content but not billing
} as const;

// Derive the union type from the object values: "user" | "admin" | "moderator"
export type TUserRole = (typeof ROLES)[keyof typeof ROLES];

// ─── Account Status ───────────────────────────────────────────────────────────
/**
 * Lifecycle states of a user account.
 */
export const ACCOUNT_STATUS = {
  ACTIVE: "active",       // Normal, fully functional account
  INACTIVE: "inactive",   // Soft-disabled by admin
  SUSPENDED: "suspended", // Violated ToS — cannot login
  PENDING: "pending",     // Registered but email not yet verified
} as const;

export type TAccountStatus = (typeof ACCOUNT_STATUS)[keyof typeof ACCOUNT_STATUS];

// ─── Token Types ──────────────────────────────────────────────────────────────
/**
 * Identifies the purpose of a one-time token stored in the database.
 * Prevents a password-reset token from being used for email verification.
 */
export const TOKEN_TYPES = {
  EMAIL_VERIFICATION: "email_verification",
  PASSWORD_RESET: "password_reset",
  REFRESH: "refresh",
} as const;

export type TTokenType = (typeof TOKEN_TYPES)[keyof typeof TOKEN_TYPES];

// ─── Token Expiry (milliseconds) ──────────────────────────────────────────────
export const TOKEN_EXPIRY = {
  EMAIL_VERIFICATION: 24 * 60 * 60 * 1000, // 24 hours
  PASSWORD_RESET: 10 * 60 * 1000,           // 10 minutes
  REFRESH: 7 * 24 * 60 * 60 * 1000,        // 7 days
} as const;

// ─── Cookie Names ─────────────────────────────────────────────────────────────
export const COOKIE_NAMES = {
  REFRESH_TOKEN: "refreshToken",
} as const;

// ─── HTTP Status Codes ────────────────────────────────────────────────────────
// Re-exporting as named constants so controllers never use raw numbers.
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// ─── Pagination Defaults ──────────────────────────────────────────────────────
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
} as const;

// ─── Bcrypt ───────────────────────────────────────────────────────────────────
// 12 rounds is the current OWASP recommendation — strong enough, not too slow
export const BCRYPT_ROUNDS = 12;

// ─── API Versioning ───────────────────────────────────────────────────────────
export const API_PREFIX = "/api/v1";
