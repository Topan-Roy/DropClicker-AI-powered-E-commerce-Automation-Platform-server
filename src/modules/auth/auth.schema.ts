import { z } from "zod";

// =============================================================================
// Auth Zod Validation Schemas
// =============================================================================
// Note: Zod v4 uses `error` instead of `required_error`, and `.issues`
// instead of `.errors` on ZodError instances.
// =============================================================================

// ─── Reusable Field Rules ──────────────────────────────────────────────────────

const nameField = z
  .string({ error: "Name is required" })
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(50, "Name cannot exceed 50 characters");

const emailField = z
  .string({ error: "Email is required" })
  .trim()
  .toLowerCase()
  .email("Please provide a valid email address");

const passwordField = z
  .string({ error: "Password is required" })
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password cannot exceed 128 characters")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)"
  );

const tokenParamField = z
  .string({ error: "Token is required" })
  .min(1, "Token cannot be empty");

// ─── Register Schema ───────────────────────────────────────────────────────────

export const registerSchema = z
  .object({
    name: nameField,
    email: emailField,
    password: passwordField,
    confirmPassword: z.string({ error: "Please confirm your password" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

// ─── Login Schema ──────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: emailField,
  password: z.string({ error: "Password is required" }).min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ─── Verify Email Schema ───────────────────────────────────────────────────────

export const verifyEmailSchema = z.object({
  token: tokenParamField,
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

// ─── Forgot Password Schema ────────────────────────────────────────────────────

export const forgotPasswordSchema = z.object({
  email: emailField,
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

// ─── Reset Password Schema ─────────────────────────────────────────────────────

export const resetPasswordParamSchema = z.object({
  token: tokenParamField,
});

export const resetPasswordBodySchema = z
  .object({
    password: passwordField,
    confirmPassword: z.string({ error: "Please confirm your password" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordBodySchema>;

// ─── Change Password Schema ────────────────────────────────────────────────────

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ error: "Current password is required" })
      .min(1, "Current password is required"),
    newPassword: passwordField,
    confirmPassword: z.string({ error: "Please confirm your new password" }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from your current password",
    path: ["newPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// ─── Refresh Token Schema ──────────────────────────────────────────────────────

export const refreshTokenSchema = z.object({}).optional();
