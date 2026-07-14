import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";

import { env } from "@config/env.config";
import logger from "@config/logger.config";
import { globalLimiter } from "@middlewares/rateLimiter.middleware";
import errorMiddleware from "@middlewares/error.middleware";
import ApiError from "@utils/ApiError";
import { API_PREFIX } from "@constants/index";

// ─── Route Imports ────────────────────────────────────────────────────────────
// Add new module routes here as the platform grows
import authRoutes from "@modules/auth/auth.routes";
import { publicRoutes } from "@modules/public/public.routes";
import { adminRoutes } from "@modules/admin/admin.routes";
import { categoryRoutes } from "@modules/category/category.routes";
import { productRoutes } from "@modules/product/product.routes";
import { storeRoutes } from "@modules/store/store.routes";
import { orderRoutes } from "@modules/order/order.routes";

// =============================================================================
// Express App Configuration
// =============================================================================
// This file configures the Express app but does NOT call app.listen().
// Keeping listen() in server.ts allows test suites to import this app
// without binding to a real port.
// =============================================================================

const app: Application = express();

// ─── 1. Security Headers (Helmet) ─────────────────────────────────────────────
// Sets secure HTTP headers: X-Frame-Options, X-XSS-Protection,
// Content-Security-Policy, HSTS, etc.
// Must be first — before any other middleware sees the request.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow Cloudinary image loading
    contentSecurityPolicy: env.NODE_ENV === "production",  // Only enforce CSP in production
  })
);

// ─── 2. CORS ──────────────────────────────────────────────────────────────────
// Cross-Origin Resource Sharing — allows the frontend to call the API.
// credentials: true is required for cookies to work cross-origin.
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, curl)
      if (!origin) return callback(null, true);

      const allowedOrigins = [
        env.CLIENT_URL,
        // Add staging/preview URLs here in the future
      ];

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy: Origin ${origin} not allowed`));
      }
    },
    credentials: true,         // Required for cookies (refresh token)
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["X-RateLimit-Limit", "X-RateLimit-Remaining"],
  })
);

// ─── 3. Global Rate Limiter ───────────────────────────────────────────────────
// Applies to ALL routes: 100 requests per 15 minutes per IP.
// Auth routes have their own stricter limiters applied at the router level.
app.use(globalLimiter);

// ─── 4. Body Parsers ──────────────────────────────────────────────────────────
// Parse JSON bodies — limit prevents body-based DoS attacks
app.use(express.json({ limit: "10kb" }));

// Parse URL-encoded bodies (HTML form submissions)
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// Parse cookies — required for reading the refresh token httpOnly cookie
app.use(cookieParser(env.COOKIE_SECRET));

// ─── 5. Response Compression ──────────────────────────────────────────────────
// Gzip/Deflate compress responses > 1KB — reduces bandwidth ~70%
app.use(compression());

// ─── 6. Request Logger (Morgan) ───────────────────────────────────────────────
// Development: verbose colored output
// Production: combined format → pipe through Winston to log files
if (env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  // In production, stream Morgan output through Winston logger
  app.use(
    morgan("combined", {
      stream: {
        write: (message: string) => logger.http(message.trim()),
      },
      // Skip logging for health check route to reduce noise
      skip: (req) => req.url === "/health",
    })
  );
}

// ─── 7. Health Check ──────────────────────────────────────────────────────────
// Simple endpoint for load balancers / container orchestrators (K8s, ECS)
// Does NOT go through rate limiting or auth
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    status: "healthy",
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ─── 8. API Routes ────────────────────────────────────────────────────────────
// All routes versioned under /api/v1
// Future modules are added here:
//   app.use(`${API_PREFIX}/users`, userRoutes);
//   app.use(`${API_PREFIX}/products`, productRoutes);
//   app.use(`${API_PREFIX}/orders`, orderRoutes);
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/public`, publicRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);
app.use(`${API_PREFIX}/categories`, categoryRoutes);
app.use(`${API_PREFIX}/products`, productRoutes);
app.use(`${API_PREFIX}/stores`, storeRoutes);
app.use(`${API_PREFIX}/orders`, orderRoutes);

// ─── 9. 404 Handler ───────────────────────────────────────────────────────────
// Catches any request that didn't match a route above.
// Must come AFTER all routes.
app.use((_req: Request, _res: Response, next: NextFunction) => {
  next(ApiError.notFound("The requested endpoint does not exist"));
});

// ─── 10. Global Error Handler ─────────────────────────────────────────────────
// Must be LAST and have exactly 4 parameters.
// Handles all errors forwarded via next(error) from anywhere in the app.
app.use(errorMiddleware);

export default app;
