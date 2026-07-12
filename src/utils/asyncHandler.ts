import { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Wraps an async Express route handler to forward any thrown errors
 * to Express's global error middleware via next(error).
 *
 * Without this, throwing inside an async handler causes an unhandled
 * promise rejection — Express 4 will NOT catch it automatically.
 *
 * Usage in controllers:
 *   router.post('/login', asyncHandler(authController.login))
 *
 * This eliminates try/catch blocks in every controller method.
 * Controllers can simply throw ApiError and this catches + forwards it.
 */
const asyncHandler = (fn: RequestHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default asyncHandler;
