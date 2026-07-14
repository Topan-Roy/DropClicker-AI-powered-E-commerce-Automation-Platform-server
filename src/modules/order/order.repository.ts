import Order, { IOrderDocument, TOrderStatus } from "./order.model";
import type { CreateOrderInput } from "./order.schema";

interface IOrderFilters {
  status?: TOrderStatus;
  storeId?: string;
  search?: string;
}

interface IPaginatedOrders {
  data: IOrderDocument[];
  total: number;
}

class OrderRepository {
  async create(
    userId: string,
    data: CreateOrderInput
  ): Promise<IOrderDocument> {
    return Order.create({ userId, ...data });
  }

  async findAllByUser(
    userId: string,
    filters: IOrderFilters = {},
    limit = 20,
    skip = 0
  ): Promise<IPaginatedOrders> {
    const query: Record<string, any> = { userId };

    if (filters.status) query.status = filters.status;
    if (filters.storeId) query.storeId = filters.storeId;

    const [data, total] = await Promise.all([
      Order.find(query)
        .populate("storeId", "name platform storeUrl")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Order.countDocuments(query),
    ]);

    return { data, total };
  }

  async findByIdAndUser(
    id: string,
    userId: string
  ): Promise<IOrderDocument | null> {
    return Order.findOne({ _id: id, userId }).populate("storeId", "name platform storeUrl");
  }

  async findById(id: string): Promise<IOrderDocument | null> {
    return Order.findById(id).populate("storeId userId");
  }

  async updateById(
    id: string,
    data: Partial<IOrderDocument>
  ): Promise<IOrderDocument | null> {
    return Order.findByIdAndUpdate(id, data, { new: true });
  }

  // Check if order with externalOrderId from a store already exists (prevents duplicates on sync)
  async findByExternalId(
    storeId: string,
    externalOrderId: string
  ): Promise<IOrderDocument | null> {
    return Order.findOne({ storeId, externalOrderId });
  }

  // Admin: all orders
  async findAllAdmin(
    filters: IOrderFilters = {},
    limit = 50,
    skip = 0
  ): Promise<IPaginatedOrders> {
    const query: Record<string, any> = {};

    if (filters.status) query.status = filters.status;
    if (filters.storeId) query.storeId = filters.storeId;

    const [data, total] = await Promise.all([
      Order.find(query)
        .populate("userId", "name email")
        .populate("storeId", "name platform")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Order.countDocuments(query),
    ]);

    return { data, total };
  }

  // Aggregate stats for dashboard
  async getOrderStats(userId: string): Promise<{
    total: number;
    pending: number;
    processing: number;
    fulfilled: number;
    cancelled: number;
  }> {
    const result = await Order.aggregate([
      { $match: { userId: new (require("mongoose").Types.ObjectId)(userId) } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const stats: Record<string, number> = {};
    let total = 0;
    for (const entry of result) {
      stats[entry._id as string] = entry.count;
      total += entry.count;
    }

    return {
      total,
      pending: stats["pending"] ?? 0,
      processing: stats["processing"] ?? 0,
      fulfilled: stats["fulfilled"] ?? 0,
      cancelled: stats["cancelled"] ?? 0,
    };
  }
}

export default new OrderRepository();
