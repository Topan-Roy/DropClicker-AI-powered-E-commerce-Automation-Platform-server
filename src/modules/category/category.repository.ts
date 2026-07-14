import Category, { ICategoryDocument } from "./category.model";
import type { CreateCategoryInput, UpdateCategoryInput } from "./category.schema";

class CategoryRepository {
  async create(data: CreateCategoryInput): Promise<ICategoryDocument> {
    return Category.create(data);
  }

  async findAll(filter: Record<string, any> = {}): Promise<ICategoryDocument[]> {
    return Category.find(filter).sort({ createdAt: -1 });
  }

  async findById(id: string): Promise<ICategoryDocument | null> {
    return Category.findById(id);
  }

  async findByName(name: string): Promise<ICategoryDocument | null> {
    return Category.findOne({ name });
  }

  async update(id: string, data: UpdateCategoryInput): Promise<ICategoryDocument | null> {
    return Category.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async delete(id: string): Promise<ICategoryDocument | null> {
    return Category.findByIdAndDelete(id);
  }
}

export default new CategoryRepository();
