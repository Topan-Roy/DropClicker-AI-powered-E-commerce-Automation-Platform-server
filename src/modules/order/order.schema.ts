import { z } from "zod";

// ─── Shared Sub-schemas ───────────────────────────────────────────────────────
const addressSchema = z.object({
  fullName: z.string({ error: "Full name is required" }).min(2),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  addressLine1: z.string({ error: "Address is required" }).min(3),
  addressLine2: z.string().optional(),
  city: z.string({ error: "City is required" }).min(1),
  state: z.string().optional(),
  postalCode: z.string({ error: "Postal code is required" }).min(2),
  country: z.string({ error: "Country is required" }).min(2),
});

const orderItemSchema = z.object({
  productId: z.string().optional(),
  title: z.string({ error: "Item title is required" }).min(1),
  sku: z.string().optional(),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  price: z.number().min(0),
  totalPrice: z.number().min(0),
  image: z.string().optional(),
});

// ─── Create Order (manual creation from admin) ────────────────────────────────
export const createOrderSchema = z.object({
  storeId: z.string({ error: "Store ID is required" }).regex(/^[0-9a-fA-F]{24}$/, "Invalid Store ID"),
  items: z.array(orderItemSchema).min(1, "Order must have at least one item"),
  subtotal: z.number().min(0),
  shippingCost: z.number().min(0).default(0),
  taxAmount: z.number().min(0).default(0),
  discountAmount: z.number().min(0).default(0),
  totalAmount: z.number().min(0),
  shippingAddress: addressSchema,
  billingAddress: addressSchema.optional(),
  customerNote: z.string().optional(),
  orderedAt: z.string().datetime().optional(),
});

// ─── Fulfill Order ────────────────────────────────────────────────────────────
export const fulfillOrderSchema = z.object({
  carrier: z.string().optional(),
  trackingNumber: z.string().optional(),
  trackingUrl: z.string().url("Must be a valid URL").optional(),
  estimatedDelivery: z.string().datetime().optional(),
});

// ─── Update Order Status ──────────────────────────────────────────────────────
export const updateOrderStatusSchema = z.object({
  status: z.enum(
    ["pending", "processing", "fulfilled", "delivered", "completed", "cancelled", "returned", "refunded"],
    { error: "Invalid order status" }
  ),
  internalNote: z.string().optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type FulfillOrderInput = z.infer<typeof fulfillOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
