// Load environment variables and validate BEFORE importing anything else.
// This ensures env.config crashes fast if variables are missing,
// before any module tries to use them.
import "@config/env.config";

import app from "./app";
import connectDB from "@config/db.config";
import logger from "@config/logger.config";
import { env } from "@config/env.config";

// =============================================================================
// Server Entry Point
// =============================================================================
// Startup sequence:
//   1. Validate env variables (done by importing env.config above)
//   2. Connect to MongoDB
//   3. Start HTTP server
//   4. Register graceful shutdown handlers
//
// The server only starts accepting requests AFTER the DB is connected.
// This prevents request handling before the database is ready.
// =============================================================================

const startServer = async (): Promise<void> => {
  try {
    // ── Step 1: Connect to MongoDB ──────────────────────────────────────────
    // connectDB() throws on failure — caught below → process.exit(1)
    await connectDB();

    // ── Step 2: Start HTTP server ───────────────────────────────────────────
    const server = app.listen(env.PORT, () => {
      logger.info("═══════════════════════════════════════════");
      logger.info(`🚀 DropClicker API Server started`);
      logger.info(`   Environment : ${env.NODE_ENV}`);
      logger.info(`   Port        : ${env.PORT}`);
      logger.info(`   API Base    : http://localhost:${env.PORT}/api/v1`);
      logger.info(`   Health      : http://localhost:${env.PORT}/health`);
      logger.info("═══════════════════════════════════════════");
    });

    // ── Step 3: Graceful Shutdown ───────────────────────────────────────────
    // On SIGTERM (Docker stop, K8s pod termination):
    //   - Stop accepting new connections
    //   - Wait for in-flight requests to complete
    //   - Close DB connection
    //   - Exit cleanly
    const gracefulShutdown = (signal: string) => {
      logger.info(`\n${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info("✅ HTTP server closed — no longer accepting connections");
        logger.info("👋 DropClicker API shutdown complete");
        process.exit(0);
      });

      // Force shutdown after 10 seconds if graceful close hangs
      setTimeout(() => {
        logger.error("⚠️  Forced shutdown — graceful close timed out");
        process.exit(1);
      }, 10_000);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM")); // Docker/K8s stop
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));   // Ctrl+C

    // ── Step 4: Unhandled Rejection Safety Net ──────────────────────────────
    // Catches any unhandled promise rejection that escaped asyncHandler.
    // Winston's rejectionHandlers in logger.config also log these to file.
    process.on("unhandledRejection", (reason: unknown) => {
      logger.error("🔥 Unhandled Promise Rejection", { reason });
      // In production: crash so the process manager (PM2, K8s) can restart
      // In development: keep running for easier debugging
      if (env.NODE_ENV === "production") {
        server.close(() => process.exit(1));
      }
    });

    process.on("uncaughtException", (error: Error) => {
      logger.error("🔥 Uncaught Exception — shutting down", {
        error: error.message,
        stack: error.stack,
      });
      server.close(() => process.exit(1));
    });

  } catch (error) {
    // DB connection failed — no point starting the server
    logger.error("❌ Failed to start server", {
      error: error instanceof Error ? error.message : error,
    });
    process.exit(1);
  }
};

// Start the server
startServer();
