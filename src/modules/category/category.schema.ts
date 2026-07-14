import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string({ error: "Category name is required" }).min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  image: z.string().optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  isActive: z.boolean().optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
