import { Request, Response } from "express";
import categoryService from "./category.service";
import ApiResponse from "@utils/ApiResponse";
import { HTTP_STATUS } from "@constants/index";

class CategoryController {
  async createCategory(req: Request, res: Response): Promise<void> {
    const category = await categoryService.createCategory(req.body);
    new ApiResponse(HTTP_STATUS.CREATED, category, "Category created successfully").send(res);
  }

  async getAllCategories(req: Request, res: Response): Promise<void> {
    // Admin gets all, users/public get only active ones
    const includeInactive = req.user?.role === "ADMIN";
    const categories = await categoryService.getAllCategories(includeInactive);
    new ApiResponse(HTTP_STATUS.OK, categories, "Categories retrieved successfully").send(res);
  }

  async getCategoryById(req: Request, res: Response): Promise<void> {
    const category = await categoryService.getCategoryById(req.params["id"] as string);
    new ApiResponse(HTTP_STATUS.OK, category, "Category retrieved successfully").send(res);
  }

  async updateCategory(req: Request, res: Response): Promise<void> {
    const category = await categoryService.updateCategory(req.params["id"] as string, req.body);
    new ApiResponse(HTTP_STATUS.OK, category, "Category updated successfully").send(res);
  }

  async deleteCategory(req: Request, res: Response): Promise<void> {
    await categoryService.deleteCategory(req.params["id"] as string);
    new ApiResponse(HTTP_STATUS.OK, null, "Category deleted successfully").send(res);
  }
}

export default new CategoryController();
