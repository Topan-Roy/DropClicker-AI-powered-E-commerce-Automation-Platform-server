import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import mongoose from "mongoose";
import ApiError from "@utils/ApiError";
import logger from "@config/logger.config";
import { env } from "@config/env.config";

/**
 * Global Error Handling Middleware.
 *
 * Must be registered LAST in app.ts (after all routes) with exactly 4 params.
 * Express identifies error handlers by the 4-parameter signature (err, req, res, next).
 *
 * Handles:
 *  1. ApiError        — our custom operational errors
 *  2. ZodError        — validation failures from Zod schemas
 *  3. Mongoose errors — CastError, ValidationError, duplicate key (11000)
 *  4. JWT errors      — already converted to ApiError in tokenHelper, but safety net
 *  5. Unknown errors  — any other unexpected throw
 */
const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  // ─── Log the error ───────────────────────────────────────────────────────────
  // Always log the full error internally, regardless of what we send to the client
  logger.error("❌ Error caught by global handler", {
    message: err.message,
    stack: env.NODE_ENV === "development" ? err.stack : undefined,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  // ─── 1. Our custom ApiError ───────────────────────────────────────────────────
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      statusCode: err.statusCode,
      message: err.message,
      errors: err.errors,
      // Stack trace only visible in development
      ...(env.NODE_ENV === "development" && { stack: err.stack }),
    });
    return;
  }

  // ─── 2. Zod Validation Error ──────────────────────────────────────────────────
  // Happens if Zod throws directly (outside our validate middleware)
  if (err instanceof ZodError) {
    const errors = err.issues.map((e) => ({
      field: (e.path as (string | number)[]).join("."),
      message: e.message,
    }));

    res.status(422).json({
      success: false,
      statusCode: 422,
      message: "Validation failed",
      errors,
    });
    return;
  }

  // ─── 3. Mongoose CastError (invalid ObjectId) ─────────────────────────────────
  // e.g. /users/not-a-valid-id → Mongoose throws CastError
  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({
      success: false,
      statusCode: 400,
      message: `Invalid value for field: ${err.path}`,
      errors: [],
    });
    return;
  }

  // ─── 4. Mongoose Validation Error ────────────────────────────────────────────
  if (err instanceof mongoose.Error.ValidationError) {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));

    res.status(422).json({
      success: false,
      statusCode: 422,
      message: "Database validation failed",
      errors,
    });
    return;
  }

  // ─── 5. MongoDB Duplicate Key Error (code 11000) ──────────────────────────────
  // e.g. registering with an email that already exists
  if (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as NodeJS.ErrnoException).code === "11000"
  ) {
    const field = Object.keys((err as Record<string, unknown>)?.["keyValue"] ?? {})[0] ?? "field";

    res.status(409).json({
      success: false,
      statusCode: 409,
      message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`,
      errors: [],
    });
    return;
  }

  // ─── 6. Fallback — Unknown / Unexpected Error ─────────────────────────────────
  // Never reveal internal error details in production
  const message =
    env.NODE_ENV === "development"
      ? err.message
      : "Something went wrong. Please try again later.";

  res.status(500).json({
    success: false,
    statusCode: 500,
    message,
    errors: [],
    ...(env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

export default errorMiddleware;
