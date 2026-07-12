import nodemailer, { Transporter } from "nodemailer";
import { env } from "@config/env.config";
import logger from "@config/logger.config";

// ─── Email Options Interface ───────────────────────────────────────────────────

export interface IEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string; // Plain text fallback for email clients that don't render HTML
}

// ─── Transporter (singleton) ───────────────────────────────────────────────────

/**
 * Create the Nodemailer transport once and reuse it.
 * Creating a new transport per email wastes resources and slows delivery.
 *
 * In development: uses your SMTP credentials (Gmail App Password, Mailtrap, etc.)
 * In production: swap to a transactional email service (SendGrid, Mailgun, SES)
 *                by changing only the transport config here.
 */
let transporter: Transporter;

const getTransporter = (): Transporter => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465, // true for port 465 (SSL), false for 587 (TLS)
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
      // Connection pool — reuse connections instead of opening a new one per email
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    });
  }
  return transporter;
};

// ─── Send Email ────────────────────────────────────────────────────────────────

/**
 * Sends a transactional email.
 *
 * Usage in auth service:
 *   await sendEmail({
 *     to: user.email,
 *     subject: 'Verify your email',
 *     html: emailVerificationTemplate(verifyUrl),
 *   })
 *
 * Throws on failure so the calling service can decide how to handle it.
 * The service can choose to re-throw (block registration) or swallow
 * the error (allow registration, retry email later).
 */
const sendEmail = async (options: IEmailOptions): Promise<void> => {
  const transport = getTransporter();

  const mailOptions = {
    from: env.EMAIL_FROM,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text ?? stripHtml(options.html), // Auto-generate plain text if not provided
  };

  try {
    const info = await transport.sendMail(mailOptions);
    logger.info("📧 Email sent successfully", {
      to: options.to,
      subject: options.subject,
      messageId: info.messageId,
    });
  } catch (error) {
    logger.error("❌ Email delivery failed", {
      to: options.to,
      subject: options.subject,
      error: error instanceof Error ? error.message : error,
    });
    throw error; // Re-throw so the service knows the email didn't send
  }
};

// ─── Email Templates ───────────────────────────────────────────────────────────

/**
 * HTML template for email verification.
 * Called by auth service after registration.
 */
export const emailVerificationTemplate = (
  verifyUrl: string,
  userName: string
): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">DropClicker</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0;">AI-powered E-commerce Automation</p>
    </div>
    <div style="padding: 40px;">
      <h2 style="color: #333; margin-top: 0;">Verify Your Email Address</h2>
      <p style="color: #666; line-height: 1.6;">Hi <strong>${userName}</strong>,</p>
      <p style="color: #666; line-height: 1.6;">
        Thank you for registering with DropClicker. Please verify your email address
        to activate your account and get started.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${verifyUrl}"
           style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white; padding: 14px 32px; border-radius: 6px;
                  text-decoration: none; font-weight: bold; font-size: 16px;
                  display: inline-block;">
          Verify Email Address
        </a>
      </div>
      <p style="color: #999; font-size: 13px; line-height: 1.6;">
        This link expires in <strong>24 hours</strong>. If you did not create an account,
        you can safely ignore this email.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
      <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
        If the button doesn't work, copy and paste this link:<br>
        <a href="${verifyUrl}" style="color: #667eea; word-break: break-all;">${verifyUrl}</a>
      </p>
    </div>
  </div>
</body>
</html>
`;

/**
 * HTML template for password reset.
 * Called by auth service on forgot-password request.
 */
export const passwordResetTemplate = (
  resetUrl: string,
  userName: string
): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 40px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">DropClicker</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0;">Password Reset Request</p>
    </div>
    <div style="padding: 40px;">
      <h2 style="color: #333; margin-top: 0;">Reset Your Password</h2>
      <p style="color: #666; line-height: 1.6;">Hi <strong>${userName}</strong>,</p>
      <p style="color: #666; line-height: 1.6;">
        We received a request to reset your password. Click the button below to create
        a new password. This link is valid for <strong>10 minutes</strong>.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetUrl}"
           style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                  color: white; padding: 14px 32px; border-radius: 6px;
                  text-decoration: none; font-weight: bold; font-size: 16px;
                  display: inline-block;">
          Reset Password
        </a>
      </div>
      <p style="color: #999; font-size: 13px; line-height: 1.6;">
        If you did not request a password reset, please ignore this email.
        Your password will remain unchanged.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
      <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
        If the button doesn't work, copy and paste this link:<br>
        <a href="${resetUrl}" style="color: #f5576c; word-break: break-all;">${resetUrl}</a>
      </p>
    </div>
  </div>
</body>
</html>
`;

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Very basic HTML stripper for generating plain text fallback.
 * Removes HTML tags and collapses whitespace.
 */
const stripHtml = (html: string): string => {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
};

export default sendEmail;
