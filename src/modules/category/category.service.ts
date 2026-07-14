import categoryRepository from "./category.repository";
import ApiError from "@utils/ApiError";
import type { CreateCategoryInput, UpdateCategoryInput } from "./category.schema";
import { ICategoryDocument } from "./category.model";

class CategoryService {
  async createCategory(data: CreateCategoryInput): Promise<ICategoryDocument> {
    const exists = await categoryRepository.findByName(data.name);
    if (exists) {
      throw ApiError.badRequest("Category with this name already exists");
    }
    return categoryRepository.create(data);
  }

  async getAllCategories(includeInactive: boolean = false): Promise<ICategoryDocument[]> {
    const filter = includeInactive ? {} : { isActive: true };
    return categoryRepository.findAll(filter);
  }

  async getCategoryById(id: string): Promise<ICategoryDocument> {
    const category = await categoryRepository.findById(id);
    if (!category) {
      throw ApiError.notFound("Category not found");
    }
    return category;
  }

  async updateCategory(id: string, data: UpdateCategoryInput): Promise<ICategoryDocument> {
    if (data.name) {
      const exists = await categoryRepository.findByName(data.name);
      if (exists && exists._id.toString() !== id) {
        throw ApiError.badRequest("Category with this name already exists");
      }
    }
    
    // We update via repository but need to trigger pre-save hook for slug if name changed.
    // findByIdAndUpdate does not trigger pre-save by default, so we can fetch, modify, save.
    const category = await categoryRepository.findById(id);
    if (!category) {
      throw ApiError.notFound("Category not found");
    }

    if (data.name !== undefined) category.name = data.name;
    if (data.description !== undefined) category.description = data.description;
    if (data.image !== undefined) category.image = data.image;
    if (data.isActive !== undefined) category.isActive = data.isActive;

    await category.save();
    return category;
  }

  async deleteCategory(id: string): Promise<void> {
    const category = await categoryRepository.findById(id);
    if (!category) {
      throw ApiError.notFound("Category not found");
    }
    
    // Here you would check if products exist for this category before deleting
    // throw ApiError.badRequest("Cannot delete category with associated products");

    await categoryRepository.delete(id);
  }
}

export default new CategoryService();
