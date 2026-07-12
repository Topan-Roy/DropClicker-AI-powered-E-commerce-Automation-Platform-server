import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "@utils/tokenHelper";
import ApiError from "@utils/ApiError";
import { TUserRole } from "@constants/index";

/**
 * Authentication Middleware — `authenticate`
 *
 * Verifies the JWT access token from the Authorization header.
 * Sets req.user with the decoded payload if valid.
 *
 * Token extraction order:
 *   1. Authorization: Bearer <token>  (primary — used by API clients)
 *   2. Cookie: accessToken            (fallback — used by browser clients)
 *
 * Throws 401 if:
 *   - No token provided
 *   - Token is expired
 *   - Token signature is invalid
 */
export const authenticate = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    let token: string | undefined;

    // 1. Try Authorization header first (Bearer token)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    // 2. Fall back to cookie (set by login/refresh endpoints)
    if (!token && req.cookies?.accessToken) {
      token = req.cookies.accessToken as string;
    }

    if (!token) {
      throw ApiError.unauthorized("Access token is required. Please log in.");
    }

    // verifyAccessToken throws ApiError if invalid/expired
    const decoded = verifyAccessToken(token);

    // Attach decoded payload to request — available in all downstream handlers
    req.user = decoded;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Authorization Middleware — `authorize(...roles)`
 *
 * Must be used AFTER `authenticate` (requires req.user to be set).
 * Checks that the authenticated user's role is in the allowed list.
 *
 * Usage:
 *   router.delete('/users/:id',
 *     authenticate,
 *     authorize('admin'),
 *     asyncHandler(userController.deleteUser)
 *   )
 *
 *   router.get('/reports',
 *     authenticate,
 *     authorize('admin', 'moderator'),
 *     asyncHandler(reportController.getAll)
 *   )
 *
 * Throws 401 if authenticate hasn't run (no req.user).
 * Throws 403 if the user's role is not in the allowed list.
 */
export const authorize = (...allowedRoles: TUserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(ApiError.unauthorized("Authentication required"));
    }

    const userRole = req.user.role as TUserRole;

    if (!allowedRoles.includes(userRole)) {
      return next(
        ApiError.forbidden(
          `Access denied. Required role: ${allowedRoles.join(" or ")}`
        )
      );
    }

    next();
  };
};
