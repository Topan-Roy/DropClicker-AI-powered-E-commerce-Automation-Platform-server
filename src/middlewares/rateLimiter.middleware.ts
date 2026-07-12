import rateLimit from "express-rate-limit";
import { env } from "@config/env.config";
import ApiError from "@utils/ApiError";

/**
 * Rate limiter factory.
 * Returns a configured express-rate-limit middleware.
 *
 * We define multiple named limiters for different route sensitivities:
 *  - globalLimiter      → all routes (generous, protects against DDoS)
 *  - authLimiter        → login/register (strict, protects against brute force)
 *  - forgotPasswordLimiter → very strict (protects against email spam)
 */

// ─── Global Limiter ────────────────────────────────────────────────────────────
// Applied to all routes in app.ts
export const globalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS, // 15 minutes (from env)
  max: env.RATE_LIMIT_MAX,            // 100 requests per window (from env)
  standardHeaders: true,              // Return rate limit info in RateLimit-* headers
  legacyHeaders: false,               // Disable X-RateLimit-* headers (deprecated)
  message: "Too many requests from this IP, please try again later.",

  // Use our custom ApiError format for rate limit responses
  handler: (_req, _res, next) => {
    next(ApiError.tooManyRequests("Too many requests. Please slow down."));
  },
});

// ─── Auth Limiter ──────────────────────────────────────────────────────────────
// Applied to /auth/login, /auth/register, /auth/refresh-token
// Stricter: 10 attempts per 15 minutes per IP
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins against the limit

  handler: (_req, _res, next) => {
    next(
      ApiError.tooManyRequests(
        "Too many authentication attempts. Please try again in 15 minutes."
      )
    );
  },
});

// ─── Forgot Password Limiter ───────────────────────────────────────────────────
// Very strict: 3 requests per hour per IP
// Prevents email spam / account enumeration attacks
export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,

  handler: (_req, _res, next) => {
    next(
      ApiError.tooManyRequests(
        "Too many password reset requests. Please try again in 1 hour."
      )
    );
  },
});
