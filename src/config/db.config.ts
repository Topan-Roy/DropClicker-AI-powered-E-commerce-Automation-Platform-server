import mongoose from "mongoose";
import { env } from "@config/env.config";
import logger from "@config/logger.config";

/**
 * Connects to MongoDB using Mongoose.
 *
 * Called once in server.ts — the HTTP server only starts
 * after this resolves successfully.
 *
 * Design decisions:
 *  - Throws on failure so server.ts can handle graceful shutdown
 *  - Mongoose event listeners log connection state changes
 *  - bufferCommands: false — fail fast if DB is down, don't queue commands
 */
const connectDB = async (): Promise<void> => {
  try {
    // Mongoose connection options
    const options: mongoose.ConnectOptions = {
      // Do not buffer commands when disconnected — fail immediately
      bufferCommands: false,

      // Automatically create indexes defined in schemas (disable in high-traffic prod)
      autoIndex: env.NODE_ENV !== "production",

      // Connection pool — max concurrent connections to MongoDB
      maxPoolSize: 10,

      // How long to try connecting before timing out
      serverSelectionTimeoutMS: 5000,

      // How long a socket stays inactive before closing
      socketTimeoutMS: 45000,
    };

    await mongoose.connect(env.MONGODB_URI, options);

    logger.info("✅ MongoDB connected successfully");
  } catch (error) {
    logger.error("❌ MongoDB connection failed", { error });
    throw error; // Re-throw so server.ts can call process.exit(1)
  }
};

// ─── Mongoose Event Listeners ─────────────────────────────────────────────────

mongoose.connection.on("connected", () => {
  logger.info("📦 Mongoose connection established");
});

mongoose.connection.on("error", (err) => {
  logger.error("❌ Mongoose connection error", { error: err.message });
});

mongoose.connection.on("disconnected", () => {
  logger.warn("⚠️  Mongoose disconnected from MongoDB");
});

// Graceful shutdown — close connection when Node process exits
process.on("SIGINT", async () => {
  await mongoose.connection.close();
  logger.info("🔌 MongoDB connection closed on app termination");
  process.exit(0);
});

export default connectDB;
