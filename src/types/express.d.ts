import { IAccessTokenPayload } from "@utils/tokenHelper";

/**
 * Augments Express's Request interface to add custom properties
 * that our middleware attaches at runtime.
 *
 * This is a TypeScript declaration merging technique —
 * we extend the existing namespace rather than replacing it.
 *
 * After the auth middleware runs:
 *   req.user  → { userId, email, role } decoded from JWT
 *   req.userId → shorthand for req.user.userId
 *
 * Usage in a protected controller:
 *   const userId = req.user.userId;  // fully typed, no casting needed
 */
declare global {
  namespace Express {
    interface Request {
      /**
       * Set by auth.middleware.ts after verifying the JWT access token.
       * Contains the decoded token payload.
       */
      user?: IAccessTokenPayload;
    }
  }
}

// This empty export is required to make TypeScript treat this as a module
// rather than a global script file (declaration merging requires module scope)
export {};
