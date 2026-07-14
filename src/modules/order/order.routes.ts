import { Router } from "express";
import orderController from "./order.controller";
import { createOrderSchema, fulfillOrderSchema, updateOrderStatusSchema } from "./order.schema";
import validate from "@middlewares/validate.middleware";
import { authenticate, authorize } from "@middlewares/auth.middleware";
import asyncHandler from "@utils/asyncHandler";
import { ROLES } from "@constants/index";

const router = Router();

// All order routes require authentication
router.use(authenticate);

// ─── Stats — must come before /:id to avoid route conflict ────────────────────
/**
 * GET /api/v1/orders/stats
 * Returns count breakdown: total, pending, processing, fulfilled, cancelled
 */
router.get("/stats", asyncHandler(orderController.getOrderStats));

// ─── Sync — bulk import from external platform ────────────────────────────────
/**
 * POST /api/v1/orders/sync
 * Accepts an array of raw orders from Shopify/WooCommerce webhook / cron.
 * Deduplicates by externalOrderId. Used by the sync service (Phase 3).
 */
router.post("/sync", asyncHandler(orderController.syncOrders));

// ─── Standard CRUD ────────────────────────────────────────────────────────────

/**
 * POST /api/v1/orders
 * Manually create an order (useful for testing or manual entry)
 */
router.post(
  "/",
  validate(createOrderSchema),
  asyncHandler(orderController.createOrder)
);

/**
 * GET /api/v1/orders
 * List authenticated user's orders with optional filters:
 *   ?status=pending&storeId=xxx&page=1&limit=20
 */
router.get("/", asyncHandler(orderController.getUserOrders));

/**
 * GET /api/v1/orders/:id
 * Get a single order detail (user-scoped)
 */
router.get("/:id", asyncHandler(orderController.getOrderById));

/**
 * PATCH /api/v1/orders/:id/status
 * Update order status (pending → processing → delivered → completed, etc.)
 * Guards against updating terminal states.
 */
router.patch(
  "/:id/status",
  validate(updateOrderStatusSchema),
  asyncHandler(orderController.updateOrderStatus)
);

/**
 * POST /api/v1/orders/:id/fulfill
 * Mark order as fulfilled and attach tracking info (carrier, tracking number, URL).
 */
router.post(
  "/:id/fulfill",
  validate(fulfillOrderSchema),
  asyncHandler(orderController.fulfillOrder)
);

// ─── Admin Routes ─────────────────────────────────────────────────────────────

/**
 * GET /api/v1/orders/admin/all
 * Admin view: all orders across all merchants with user and store info
 */
router.get(
  "/admin/all",
  authorize(ROLES.ADMIN),
  asyncHandler(orderController.getAllOrdersAdmin)
);

export const orderRoutes = router;
