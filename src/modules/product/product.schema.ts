import { z } from "zod";

export const createProductSchema = z.object({
  title: z.string({ error: "Product title is required" }).min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  price: z.number({ error: "Price is required" }).min(0, "Price must be a positive number"),
  compareAtPrice: z.number().min(0).optional(),
  costPerItem: z.number().min(0).optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  inventoryQuantity: z.number().int().min(0).default(0),
  weight: z.number().min(0).optional(),
  category: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid Category ID").optional(),
  tags: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]).default("DRAFT"),
});

export const updateProductSchema = createProductSchema.partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
