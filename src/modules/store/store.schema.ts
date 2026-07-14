import { z } from "zod";

// ─── Connect Store ─────────────────────────────────────────────────────────────
export const connectStoreSchema = z.object({
  name: z
    .string({ error: "Store name is required" })
    .min(2, "Store name must be at least 2 characters")
    .max(100, "Store name cannot exceed 100 characters"),

  platform: z.enum(["shopify", "woocommerce", "etsy", "amazon", "custom"], {
    error: "Platform must be one of: shopify, woocommerce, etsy, amazon, custom",
  }),

  storeUrl: z
    .string({ error: "Store URL is required" })
    .min(3, "Store URL is required"),

  apiKey: z.string().optional(),
  apiSecret: z.string().optional(),
  accessToken: z.string().optional(),

  currency: z.string().length(3, "Currency must be a 3-letter code (e.g. USD)").default("USD"),
  autoFulfill: z.boolean().default(false),
  syncInventory: z.boolean().default(true),
});

// ─── Update Store Settings ─────────────────────────────────────────────────────
export const updateStoreSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  autoFulfill: z.boolean().optional(),
  syncInventory: z.boolean().optional(),
  currency: z.string().length(3).optional(),
  status: z.enum(["active", "disconnected"]).optional(),
});

export type ConnectStoreInput = z.infer<typeof connectStoreSchema>;
export type UpdateStoreInput = z.infer<typeof updateStoreSchema>;
