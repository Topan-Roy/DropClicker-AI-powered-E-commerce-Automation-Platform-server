import productRepository from "./product.repository";
import ApiError from "@utils/ApiError";
import type { CreateProductInput, UpdateProductInput } from "./product.schema";
import { IProductDocument } from "./product.model";

class ProductService {
  async createProduct(data: CreateProductInput, supplierId?: string): Promise<IProductDocument> {
    return productRepository.create({ ...data, supplierId });
  }

  async getAllProducts(query: any): Promise<{ data: IProductDocument[], total: number, page: number, limit: number }> {
    const { page = 1, limit = 20, status, category, search } = query;
    const skip = (Number(page) - 1) * Number(limit);
    
    const filter: Record<string, any> = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (search) filter.title = { $regex: search, $options: "i" };

    const { data, total } = await productRepository.findAll(filter, Number(limit), skip);
    return { data, total, page: Number(page), limit: Number(limit) };
  }

  async getProductById(id: string): Promise<IProductDocument> {
    const product = await productRepository.findById(id);
    if (!product) {
      throw ApiError.notFound("Product not found");
    }
    return product;
  }

  async updateProduct(id: string, data: UpdateProductInput): Promise<IProductDocument> {
    const product = await productRepository.findById(id);
    if (!product) {
      throw ApiError.notFound("Product not found");
    }
    
    // Check if supplier is trying to update a product they don't own
    // This logic can be expanded in the controller

    if (data.title) product.title = data.title;
    if (data.description !== undefined) product.description = data.description;
    if (data.price !== undefined) product.price = data.price;
    if (data.compareAtPrice !== undefined) product.compareAtPrice = data.compareAtPrice;
    if (data.costPerItem !== undefined) product.costPerItem = data.costPerItem;
    if (data.sku !== undefined) product.sku = data.sku;
    if (data.barcode !== undefined) product.barcode = data.barcode;
    if (data.inventoryQuantity !== undefined) product.inventoryQuantity = data.inventoryQuantity;
    if (data.weight !== undefined) product.weight = data.weight;
    if (data.category !== undefined) product.category = data.category as any;
    if (data.tags !== undefined) product.tags = data.tags;
    if (data.images !== undefined) product.images = data.images;
    if (data.status !== undefined) product.status = data.status;

    await product.save();
    return product;
  }

  async deleteProduct(id: string): Promise<void> {
    const product = await productRepository.findById(id);
    if (!product) {
      throw ApiError.notFound("Product not found");
    }
    await productRepository.delete(id);
  }
}

export default new ProductService();
