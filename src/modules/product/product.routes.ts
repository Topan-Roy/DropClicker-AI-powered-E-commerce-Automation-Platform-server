import { Router } from "express";
import productController from "./product.controller";
import { createProductSchema, updateProductSchema } from "./product.schema";
import validate from "@middlewares/validate.middleware";
import { authenticate, authorize, optionalAuthenticate } from "@middlewares/auth.middleware";
import asyncHandler from "@utils/asyncHandler";
import { ROLES } from "@constants/index";

const router = Router();

// Public Routes (Optional - can be accessed without auth if needed for storefront)
router.get("/", optionalAuthenticate, asyncHandler(productController.getAllProducts));
router.get("/:id", optionalAuthenticate, asyncHandler(productController.getProductById));

// Protected Routes - Admin & Suppliers can manage products
router.post(
  "/",
  authenticate,
  authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN, "SUPPLIER" as any),
  validate(createProductSchema),
  asyncHandler(productController.createProduct)
);

router.patch(
  "/:id",
  authenticate,
  authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN, "SUPPLIER" as any),
  validate(updateProductSchema),
  asyncHandler(productController.updateProduct)
);

router.delete(
  "/:id",
  authenticate,
  authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN),
  asyncHandler(productController.deleteProduct)
);

export const productRoutes = router;
