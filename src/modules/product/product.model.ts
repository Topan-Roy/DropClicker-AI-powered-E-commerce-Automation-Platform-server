import mongoose, { Schema, Document } from "mongoose";

export interface IProductDocument extends Document {
  title: string;
  slug: string;
  description?: string;
  price: number;
  compareAtPrice?: number;
  costPerItem?: number;
  sku?: string;
  barcode?: string;
  inventoryQuantity: number;
  weight?: number;
  category?: mongoose.Types.ObjectId;
  tags?: string[];
  images?: string[];
  status: "ACTIVE" | "DRAFT" | "ARCHIVED";
  supplierId?: mongoose.Types.ObjectId;
  aiOptimizedDescription?: string;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProductDocument>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true },
    description: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0 },
    costPerItem: { type: Number, min: 0 },
    sku: { type: String, trim: true },
    barcode: { type: String, trim: true },
    inventoryQuantity: { type: Number, default: 0, min: 0 },
    weight: { type: Number, min: 0 },
    category: { type: Schema.Types.ObjectId, ref: "Category" },
    tags: [{ type: String, trim: true }],
    images: [{ type: String }],
    status: { type: String, enum: ["ACTIVE", "DRAFT", "ARCHIVED"], default: "DRAFT" },
    supplierId: { type: Schema.Types.ObjectId, ref: "User" },
    aiOptimizedDescription: { type: String },
  },
  { timestamps: true, versionKey: false }
);

productSchema.pre("save", async function () {
  if (this.isModified("title")) {
    this.slug = this.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "") + "-" + Date.now().toString().slice(-4);
  }
});

productSchema.index({ slug: 1 });
productSchema.index({ category: 1 });
productSchema.index({ status: 1 });

const Product = mongoose.model<IProductDocument>("Product", productSchema);
export default Product;
