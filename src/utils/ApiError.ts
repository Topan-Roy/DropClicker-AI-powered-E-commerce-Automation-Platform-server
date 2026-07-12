/**
 * Custom API Error class.
 *
 * Extends the native Error so it can be thrown anywhere (service, repository,
 * middleware) and caught by the global error handler, which reads statusCode
 * to send the correct HTTP response.
 *
 * isOperational = true  → expected business error (wrong password, user not found)
 * isOperational = false → unexpected crash (DB down, programming bug)
 *
 * The global error handler returns a generic 500 message for non-operational
 * errors in production so internal details are never leaked to clients.
 */
class ApiError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errors: Record<string, string>[];

  constructor(
    statusCode: number,
    message: string,
    errors: Record<string, string>[] = [],
    isOperational: boolean = true
  ) {
    // Pass message to native Error — makes it show in stack traces
    super(message);

    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errors = errors;

    // Capture a clean stack trace that starts at the call site, not here
    Error.captureStackTrace(this, this.constructor);

    // Restore the prototype chain broken by extending built-in classes in TS
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  // ─── Static factory helpers ─────────────────────────────────────────────────

  /** 400 — Client sent invalid data */
  static badRequest(message: string, errors: Record<string, string>[] = []) {
    return new ApiError(400, message, errors);
  }

  /** 401 — Not authenticated */
  static unauthorized(message: string = "Unauthorized") {
    return new ApiError(401, message);
  }

  /** 403 — Authenticated but not allowed */
  static forbidden(message: string = "Forbidden") {
    return new ApiError(403, message);
  }

  /** 404 — Resource not found */
  static notFound(message: string = "Resource not found") {
    return new ApiError(404, message);
  }

  /** 409 — Conflict (e.g. duplicate email) */
  static conflict(message: string) {
    return new ApiError(409, message);
  }

  /** 422 — Validation failed */
  static unprocessable(message: string, errors: Record<string, string>[] = []) {
    return new ApiError(422, message, errors);
  }

  /** 429 — Too many requests */
  static tooManyRequests(message: string = "Too many requests") {
    return new ApiError(429, message);
  }

  /** 500 — Internal server error (non-operational) */
  static internal(message: string = "Internal server error") {
    return new ApiError(500, message, [], false);
  }
}

export default ApiError;
