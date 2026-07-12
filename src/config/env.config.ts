import { z } from "zod";
import dotenv from "dotenv";

// Load .env file before validation
dotenv.config();

/**
 * Zod schema for all environment variables.
 * If any required variable is missing or has the wrong type,
 * the process will exit immediately at startup with a clear error.
 *
 * This prevents silent failures like:
 *   - JWT signed with `undefined` secret
 *   - DB connecting to wrong URI
 *   - Emails sending from wrong account
 */
const envSchema = z.object({
  // ─── Server ───────────────────────────────────────────────────────────────
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z
    .string()
    .default("5000")
    .transform((val) => parseInt(val, 10)),
  CLIENT_URL: z.string().url("CLIENT_URL must be a valid URL"),

  // ─── MongoDB ──────────────────────────────────────────────────────────────
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),

  // ─── JWT ──────────────────────────────────────────────────────────────────
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  JWT_ACCESS_EXPIRY: z.string().default("15m"),
  JWT_REFRESH_EXPIRY: z.string().default("7d"),

  // ─── Cookies ──────────────────────────────────────────────────────────────
  COOKIE_SECRET: z
    .string()
    .min(32, "COOKIE_SECRET must be at least 32 characters"),

  // ─── Cloudinary ───────────────────────────────────────────────────────────
  CLOUDINARY_CLOUD_NAME: z.string().min(1, "CLOUDINARY_CLOUD_NAME is required"),
  CLOUDINARY_API_KEY: z.string().min(1, "CLOUDINARY_API_KEY is required"),
  CLOUDINARY_API_SECRET: z.string().min(1, "CLOUDINARY_API_SECRET is required"),

  // ─── Email (Nodemailer) ───────────────────────────────────────────────────
  SMTP_HOST: z.string().min(1, "SMTP_HOST is required"),
  SMTP_PORT: z
    .string()
    .default("587")
    .transform((val) => parseInt(val, 10)),
  SMTP_USER: z.string().email("SMTP_USER must be a valid email"),
  SMTP_PASS: z.string().min(1, "SMTP_PASS is required"),
  EMAIL_FROM: z.string().min(1, "EMAIL_FROM is required"),

  // ─── Rate Limiting ────────────────────────────────────────────────────────
  RATE_LIMIT_WINDOW_MS: z
    .string()
    .default("900000")
    .transform((val) => parseInt(val, 10)),
  RATE_LIMIT_MAX: z
    .string()
    .default("100")
    .transform((val) => parseInt(val, 10)),
});

// Parse and validate — crashes the process on failure
const _parsed = envSchema.safeParse(process.env);

if (!_parsed.success) {
  console.error("❌ Invalid environment variables:\n");
  _parsed.error.issues.forEach((err) => {
    console.error(`  • ${(err.path as (string | number)[]).join(".")}: ${err.message}`);
  });
  console.error("\nFix your .env file and restart the server.\n");
  process.exit(1);
}

// Export the validated, type-safe env object
export const env = _parsed.data;

// Export the inferred type for use elsewhere
export type Env = z.infer<typeof envSchema>;
