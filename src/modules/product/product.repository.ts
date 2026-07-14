import Product, { IProductDocument } from "./product.model";
import type { CreateProductInput, UpdateProductInput } from "./product.schema";

class ProductRepository {
  async create(data: CreateProductInput & { supplierId?: string }): Promise<IProductDocument> {
    return Product.create(data);
  }

  async findAll(filter: Record<string, any> = {}, limit = 50, skip = 0): Promise<{ data: IProductDocument[], total: number }> {
    const [data, total] = await Promise.all([
      Product.find(filter).populate("category", "name slug").sort({ createdAt: -1 }).skip(skip).limit(limit),
      Product.countDocuments(filter)
    ]);
    return { data, total };
  }

  async findById(id: string): Promise<IProductDocument | null> {
    return Product.findById(id).populate("category", "name slug");
  }

  async update(id: string, data: UpdateProductInput): Promise<IProductDocument | null> {
    return Product.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async delete(id: string): Promise<IProductDocument | null> {
    return Product.findByIdAndDelete(id);
  }
}

export default new ProductRepository();
