import winston from "winston";
import path from "path";
import fs from "fs";

// Ensure logs directory exists at project root
const logsDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Custom log format for console output.
 * Produces colored, human-readable lines in development:
 *   [2024-01-15 10:30:45] INFO: Server started on port 5000
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length
      ? `\n${JSON.stringify(meta, null, 2)}`
      : "";
    return `[${timestamp}] ${level}: ${message}${metaStr}`;
  })
);

/**
 * JSON format for file logs.
 * Structured JSON is parseable by log aggregation tools (Datadog, Papertrail).
 */
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }), // Include stack traces in file logs
  winston.format.json()
);

/**
 * Winston logger instance.
 *
 * Transports:
 *  - Console: colored output, only in development
 *  - error.log: only ERROR level entries
 *  - combined.log: all levels (info and above in production)
 */
const logger = winston.createLogger({
  // Minimum log level — 'debug' in dev, 'info' in production
  level: process.env.NODE_ENV === "production" ? "info" : "debug",

  transports: [
    // Console transport — development only
    new winston.transports.Console({
      format: consoleFormat,
      silent: process.env.NODE_ENV === "test", // Suppress logs during tests
    }),

    // Error log file — only captures error level
    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10MB per file
      maxFiles: 5,               // Keep last 5 rotated files
    }),

    // Combined log file — captures everything info and above
    new winston.transports.File({
      filename: path.join(logsDir, "combined.log"),
      format: fileFormat,
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
  ],

  // Prevent Winston from crashing if an uncaught exception occurs
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, "exceptions.log"),
    }),
  ],

  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, "rejections.log"),
    }),
  ],
});

export default logger;
