import { Request, Response } from "express";
import productService from "./product.service";
import ApiResponse from "@utils/ApiResponse";
import { HTTP_STATUS } from "@constants/index";
import { ROLES } from "@constants/index";

class ProductController {
  async createProduct(req: Request, res: Response): Promise<void> {
    // If supplier or admin, assign supplierId
    const supplierId = req.user?.role !== ROLES.USER ? req.user?.userId : undefined;
    
    const product = await productService.createProduct(req.body, supplierId);
    new ApiResponse(HTTP_STATUS.CREATED, product, "Product created successfully").send(res);
  }

  async getAllProducts(req: Request, res: Response): Promise<void> {
    const query = req.query;
    // Non-admins can only see active products unless fetching their own
    if (req.user?.role === ROLES.USER || !req.user) {
      query.status = "ACTIVE";
    }
    
    const result = await productService.getAllProducts(query);
    new ApiResponse(HTTP_STATUS.OK, result, "Products retrieved successfully").send(res);
  }

  async getProductById(req: Request, res: Response): Promise<void> {
    const product = await productService.getProductById(req.params["id"] as string);
    new ApiResponse(HTTP_STATUS.OK, product, "Product retrieved successfully").send(res);
  }

  async updateProduct(req: Request, res: Response): Promise<void> {
    const product = await productService.updateProduct(req.params["id"] as string, req.body);
    new ApiResponse(HTTP_STATUS.OK, product, "Product updated successfully").send(res);
  }

  async deleteProduct(req: Request, res: Response): Promise<void> {
    await productService.deleteProduct(req.params["id"] as string);
    new ApiResponse(HTTP_STATUS.OK, null, "Product deleted successfully").send(res);
  }
}

export default new ProductController();
