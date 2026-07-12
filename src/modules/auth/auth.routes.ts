import { Router } from "express";
import authController from "@modules/auth/auth.controller";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordBodySchema,
  resetPasswordParamSchema,
  verifyEmailSchema,
  changePasswordSchema,
} from "@modules/auth/auth.schema";
import validate from "@middlewares/validate.middleware";
import { authenticate } from "@middlewares/auth.middleware";
import {
  authLimiter,
  forgotPasswordLimiter,
} from "@middlewares/rateLimiter.middleware";
import asyncHandler from "@utils/asyncHandler";
import { z } from "zod";

// =============================================================================
// Auth Router
// =============================================================================
// Middleware pipeline order per route:
//   Rate Limiter → Validate → [Authenticate] → Controller
//
// Rate limiter first: reject bots before doing any real work.
// Validate second: reject bad data before any DB/service calls.
// Authenticate third (only on protected routes): verify identity.
// Controller last: only receives valid, authenticated requests.
// =============================================================================

const router = Router();

// ─── Public Routes (no auth required) ─────────────────────────────────────────

/**
 * POST /api/v1/auth/register
 * Rate limited: 10 req / 15min per IP
 */
router.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  asyncHandler(authController.register)
);

/**
 * POST /api/v1/auth/login
 * Rate limited: 10 req / 15min per IP (successful requests excluded)
 */
router.post(
  "/login",
  authLimiter,
  validate(loginSchema),
  asyncHandler(authController.login)
);

/**
 * POST /api/v1/auth/refresh-token
 * Reads refresh token from httpOnly cookie.
 * Rate limited with auth limiter (prevents token farming).
 */
router.post(
  "/refresh-token",
  authLimiter,
  asyncHandler(authController.refreshToken)
);

/**
 * GET /api/v1/auth/verify-email/:token
 * Token comes from the email link — 64-char hex string.
 */
router.get(
  "/verify-email/:token",
  validate(verifyEmailSchema, "params"),
  asyncHandler(authController.verifyEmail)
);

/**
 * POST /api/v1/auth/resend-verification
 * Always returns 200 (anti-enumeration).
 * Uses auth limiter to prevent email spam.
 */
router.post(
  "/resend-verification",
  authLimiter,
  validate(z.object({ email: z.string().email("Valid email required") })),
  asyncHandler(authController.resendVerification)
);

/**
 * POST /api/v1/auth/forgot-password
 * Very strict rate limit: 3 req / 1 hour per IP.
 * Always returns 200 (anti-enumeration).
 */
router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  validate(forgotPasswordSchema),
  asyncHandler(authController.forgotPassword)
);

/**
 * POST /api/v1/auth/reset-password/:token
 * Token from URL, new password from body.
 * Two validations: param schema + body schema.
 */
router.post(
  "/reset-password/:token",
  authLimiter,
  validate(resetPasswordParamSchema, "params"),
  validate(resetPasswordBodySchema),
  asyncHandler(authController.resetPassword)
);

// ─── Protected Routes (valid access token required) ───────────────────────────

/**
 * POST /api/v1/auth/logout
 * Clears DB refresh token + cookie.
 * Requires authentication so we know which user to log out.
 */
router.post(
  "/logout",
  authenticate,
  asyncHandler(authController.logout)
);

/**
 * GET /api/v1/auth/me
 * Returns the authenticated user's public profile.
 * Used by frontend to hydrate app state on load / token refresh.
 */
router.get(
  "/me",
  authenticate,
  asyncHandler(authController.getMe)
);

/**
 * PATCH /api/v1/auth/change-password
 * Authenticated users changing their own password.
 */
router.patch(
  "/change-password",
  authenticate,
  validate(changePasswordSchema),
  asyncHandler(authController.changePassword)
);

export default router;
