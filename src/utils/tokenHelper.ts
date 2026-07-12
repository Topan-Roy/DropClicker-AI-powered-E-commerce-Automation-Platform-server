import jwt, { SignOptions, JwtPayload } from "jsonwebtoken";
import { env } from "@config/env.config";
import ApiError from "@utils/ApiError";

// ─── Token Payload Interfaces ──────────────────────────────────────────────────

/**
 * Payload embedded inside the access token.
 * Keep this minimal — it's in every request header.
 * Never store sensitive data (password, full profile) in a JWT payload.
 */
export interface IAccessTokenPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Payload embedded inside the refresh token.
 * Only needs the userId to look up the user and issue a new access token.
 */
export interface IRefreshTokenPayload {
  userId: string;
}

// ─── Token Generation ──────────────────────────────────────────────────────────

/**
 * Signs and returns a short-lived access token (default: 15 minutes).
 * Sent in the response body / Authorization header for API calls.
 */
export const generateAccessToken = (
  payload: IAccessTokenPayload
): string => {
  const options: SignOptions = {
    expiresIn: env.JWT_ACCESS_EXPIRY as SignOptions["expiresIn"],
    issuer: "dropclicker",
    audience: "dropclicker-client",
  };

  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
};

/**
 * Signs and returns a long-lived refresh token (default: 7 days).
 * Stored in an httpOnly cookie — never accessible to JavaScript.
 * Used exclusively to issue new access tokens.
 */
export const generateRefreshToken = (
  payload: IRefreshTokenPayload
): string => {
  const options: SignOptions = {
    expiresIn: env.JWT_REFRESH_EXPIRY as SignOptions["expiresIn"],
    issuer: "dropclicker",
    audience: "dropclicker-client",
  };

  return jwt.sign(payload, env.JWT_REFRESH_SECRET, options);
};

// ─── Token Verification ────────────────────────────────────────────────────────

/**
 * Verifies an access token and returns its decoded payload.
 * Throws ApiError.unauthorized() if invalid or expired.
 */
export const verifyAccessToken = (token: string): IAccessTokenPayload => {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: "dropclicker",
      audience: "dropclicker-client",
    }) as JwtPayload & IAccessTokenPayload;

    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw ApiError.unauthorized("Access token has expired");
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw ApiError.unauthorized("Invalid access token");
    }
    throw ApiError.unauthorized("Token verification failed");
  }
};

/**
 * Verifies a refresh token and returns its decoded payload.
 * Throws ApiError.unauthorized() if invalid or expired.
 */
export const verifyRefreshToken = (token: string): IRefreshTokenPayload => {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET, {
      issuer: "dropclicker",
      audience: "dropclicker-client",
    }) as JwtPayload & IRefreshTokenPayload;

    return { userId: decoded.userId };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw ApiError.unauthorized("Refresh token has expired. Please log in again.");
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw ApiError.unauthorized("Invalid refresh token");
    }
    throw ApiError.unauthorized("Token verification failed");
  }
};

// ─── Cookie Options ────────────────────────────────────────────────────────────

/**
 * Standard cookie options for the refresh token cookie.
 *
 * httpOnly: true       — JavaScript cannot read this cookie (prevents XSS theft)
 * secure: true in prod — Only sent over HTTPS
 * sameSite: 'strict'   — Not sent with cross-site requests (prevents CSRF)
 * maxAge               — Matches JWT_REFRESH_EXPIRY (7 days in ms)
 */
export const getRefreshTokenCookieOptions = () => ({
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  path: "/api/v1/auth",             // Cookie only sent to auth routes
});

/**
 * Cookie options to clear the refresh token (sets maxAge to 0).
 * Used during logout.
 */
export const getClearRefreshTokenCookieOptions = () => ({
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 0,
  path: "/api/v1/auth",
});
