import { Router } from "express";
import storeController from "./store.controller";
import { connectStoreSchema, updateStoreSchema } from "./store.schema";
import validate from "@middlewares/validate.middleware";
import { authenticate, authorize } from "@middlewares/auth.middleware";
import asyncHandler from "@utils/asyncHandler";
import { ROLES } from "@constants/index";

const router = Router();

// All store routes require authentication
router.use(authenticate);

// ─── User Routes ──────────────────────────────────────────────────────────────

/**
 * POST /api/v1/stores
 * Connect a new e-commerce store (Shopify, WooCommerce, etc.)
 */
router.post(
  "/",
  validate(connectStoreSchema),
  asyncHandler(storeController.connectStore)
);

/**
 * GET /api/v1/stores
 * List all stores connected by the authenticated user
 */
router.get("/", asyncHandler(storeController.getUserStores));

/**
 * GET /api/v1/stores/:id
 * Get details of a specific connected store
 */
router.get("/:id", asyncHandler(storeController.getStoreById));

/**
 * PATCH /api/v1/stores/:id
 * Update store settings (name, autoFulfill, syncInventory, currency)
 */
router.patch(
  "/:id",
  validate(updateStoreSchema),
  asyncHandler(storeController.updateStore)
);

/**
 * DELETE /api/v1/stores/:id
 * Disconnect / remove a store
 */
router.delete("/:id", asyncHandler(storeController.disconnectStore));

/**
 * POST /api/v1/stores/:id/sync
 * Trigger a manual sync of orders and products from the store
 */
router.post("/:id/sync", asyncHandler(storeController.syncStore));

// ─── Admin Routes ─────────────────────────────────────────────────────────────

/**
 * GET /api/v1/stores/admin/all
 * Admin view: all stores across all merchants
 */
router.get(
  "/admin/all",
  authorize(ROLES.ADMIN),
  asyncHandler(storeController.getAllStoresAdmin)
);

export const storeRoutes = router;
