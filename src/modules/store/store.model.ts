import mongoose, { Schema, Document } from "mongoose";

// ─── Platform types supported ──────────────────────────────────────────────────
export type TStorePlatform = "shopify" | "woocommerce" | "etsy" | "amazon" | "custom";
export type TStoreStatus = "active" | "disconnected" | "error" | "pending";

export interface IStoreDocument extends Document {
  userId: mongoose.Types.ObjectId;      // The merchant who owns this store
  name: string;                          // Display name (e.g. "My Shopify Store")
  platform: TStorePlatform;
  storeUrl: string;                      // Base URL of the store (e.g. mystore.myshopify.com)
  status: TStoreStatus;

  // ─── Credentials (encrypted at app level before storing) ────────────────────
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;                  // OAuth token for Shopify/Etsy
  webhookSecret?: string;                // For verifying incoming webhooks

  // ─── Sync Metadata ───────────────────────────────────────────────────────────
  lastSyncedAt?: Date;
  totalProductsSynced: number;
  totalOrdersSynced: number;
  syncErrors?: string[];

  // ─── Settings ────────────────────────────────────────────────────────────────
  autoFulfill: boolean;                  // Auto-fulfill orders on sync
  syncInventory: boolean;               // Keep inventory in sync
  currency: string;

  createdAt: Date;
  updatedAt: Date;
}

const storeSchema = new Schema<IStoreDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Store name is required"],
      trim: true,
      maxlength: [100, "Store name cannot exceed 100 characters"],
    },
    platform: {
      type: String,
      enum: ["shopify", "woocommerce", "etsy", "amazon", "custom"],
      required: [true, "Platform is required"],
    },
    storeUrl: {
      type: String,
      required: [true, "Store URL is required"],
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "disconnected", "error", "pending"],
      default: "pending",
    },

    // Credentials — stored as encrypted strings (app-level encryption)
    apiKey: { type: String, select: false },
    apiSecret: { type: String, select: false },
    accessToken: { type: String, select: false },
    webhookSecret: { type: String, select: false },

    // Sync tracking
    lastSyncedAt: { type: Date },
    totalProductsSynced: { type: Number, default: 0 },
    totalOrdersSynced: { type: Number, default: 0 },
    syncErrors: [{ type: String }],

    // Settings
    autoFulfill: { type: Boolean, default: false },
    syncInventory: { type: Boolean, default: true },
    currency: { type: String, default: "USD", maxlength: 3 },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound index: one user can connect same platform only once per storeUrl
storeSchema.index({ userId: 1, storeUrl: 1, platform: 1 }, { unique: true });

const Store = mongoose.model<IStoreDocument>("Store", storeSchema);
export default Store;
