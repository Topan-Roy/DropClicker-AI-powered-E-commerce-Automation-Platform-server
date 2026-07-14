import mongoose, { Schema, Document } from "mongoose";

// ─── Order Status Lifecycle ────────────────────────────────────────────────────
// pending → processing → fulfilled → delivered → completed
//                      ↘ cancelled  ↗ returned
export type TOrderStatus =
  | "pending"
  | "processing"
  | "fulfilled"
  | "delivered"
  | "completed"
  | "cancelled"
  | "returned"
  | "refunded";

export type TPaymentStatus = "unpaid" | "paid" | "partially_refunded" | "refunded";

// ─── Sub-documents ────────────────────────────────────────────────────────────
export interface IOrderItem {
  productId?: mongoose.Types.ObjectId;
  title: string;
  sku?: string;
  quantity: number;
  price: number;           // Unit price at time of order (immutable snapshot)
  totalPrice: number;      // quantity × price
  image?: string;
}

export interface IShippingAddress {
  fullName: string;
  email?: string;
  phone?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

export interface ITracking {
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  shippedAt?: Date;
  estimatedDelivery?: Date;
  deliveredAt?: Date;
}

// ─── Main Order Document ──────────────────────────────────────────────────────
export interface IOrderDocument extends Document {
  // Ownership & Store Link
  userId: mongoose.Types.ObjectId;      // Merchant who owns the order
  storeId: mongoose.Types.ObjectId;     // Store this order came from
  externalOrderId?: string;             // ID in Shopify/WooCommerce
  externalOrderNumber?: string;         // Human-readable order number from platform

  // Order Details
  items: IOrderItem[];
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;

  // Status
  status: TOrderStatus;
  paymentStatus: TPaymentStatus;

  // Addresses
  shippingAddress: IShippingAddress;
  billingAddress?: IShippingAddress;

  // Tracking
  tracking?: ITracking;

  // Notes
  customerNote?: string;
  internalNote?: string;

  // Timestamps
  orderedAt?: Date;          // When the customer placed the order
  fulfilledAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product" },
    title: { type: String, required: true },
    sku: { type: String },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
    image: { type: String },
  },
  { _id: false }
);

const shippingAddressSchema = new Schema<IShippingAddress>(
  {
    fullName: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    addressLine1: { type: String, required: true },
    addressLine2: { type: String },
    city: { type: String, required: true },
    state: { type: String },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
  },
  { _id: false }
);

const trackingSchema = new Schema<ITracking>(
  {
    carrier: { type: String },
    trackingNumber: { type: String },
    trackingUrl: { type: String },
    shippedAt: { type: Date },
    estimatedDelivery: { type: Date },
    deliveredAt: { type: Date },
  },
  { _id: false }
);

const orderSchema = new Schema<IOrderDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    storeId: {
      type: Schema.Types.ObjectId,
      ref: "Store",
      required: true,
      index: true,
    },
    externalOrderId: { type: String },
    externalOrderNumber: { type: String },

    items: { type: [orderItemSchema], required: true },
    subtotal: { type: Number, required: true, min: 0 },
    shippingCost: { type: Number, default: 0, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },

    status: {
      type: String,
      enum: ["pending", "processing", "fulfilled", "delivered", "completed", "cancelled", "returned", "refunded"],
      default: "pending",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "partially_refunded", "refunded"],
      default: "unpaid",
    },

    shippingAddress: { type: shippingAddressSchema, required: true },
    billingAddress: { type: shippingAddressSchema },
    tracking: { type: trackingSchema },

    customerNote: { type: String },
    internalNote: { type: String },

    orderedAt: { type: Date },
    fulfilledAt: { type: Date },
    cancelledAt: { type: Date },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound index for efficient per-user, per-store queries
orderSchema.index({ userId: 1, status: 1 });
orderSchema.index({ storeId: 1, externalOrderId: 1 }, { unique: true, sparse: true });

const Order = mongoose.model<IOrderDocument>("Order", orderSchema);
export default Order;
