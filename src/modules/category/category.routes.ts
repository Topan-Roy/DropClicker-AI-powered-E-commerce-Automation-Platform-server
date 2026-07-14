import { Router } from "express";
import categoryController from "./category.controller";
import { createCategorySchema, updateCategorySchema } from "./category.schema";
import validate from "@middlewares/validate.middleware";
import { authenticate, authorize } from "@middlewares/auth.middleware";
import asyncHandler from "@utils/asyncHandler";
import { ROLES } from "@constants/index";

const router = Router();

// Public / User Routes
router.get("/", asyncHandler(categoryController.getAllCategories));
router.get("/:id", asyncHandler(categoryController.getCategoryById));

// Admin Routes
router.post(
  "/",
  authenticate,
  authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  validate(createCategorySchema),
  asyncHandler(categoryController.createCategory)
);

router.patch(
  "/:id",
  authenticate,
  authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  validate(updateCategorySchema),
  asyncHandler(categoryController.updateCategory)
);

router.delete(
  "/:id",
  authenticate,
  authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  asyncHandler(categoryController.deleteCategory)
);

export const categoryRoutes = router;
