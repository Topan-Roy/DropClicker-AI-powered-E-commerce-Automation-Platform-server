import orderRepository from "./order.repository";
import storeRepository from "@modules/store/store.repository";
import ApiError from "@utils/ApiError";
import type { CreateOrderInput, FulfillOrderInput, UpdateOrderStatusInput } from "./order.schema";
import { IOrderDocument } from "./order.model";

class OrderService {
  // ─── Create order manually ───────────────────────────────────────────────────
  async createOrder(userId: string, data: CreateOrderInput): Promise<IOrderDocument> {
    // Verify store belongs to user
    const store = await storeRepository.findByIdAndUser(data.storeId, userId);
    if (!store) {
      throw ApiError.notFound("Store not found or you do not have access to it.");
    }

    return orderRepository.create(userId, data);
  }

  // ─── List orders (paginated + filtered) ─────────────────────────────────────
  async getUserOrders(
    userId: string,
    query: any
  ): Promise<{ data: IOrderDocument[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 20, status, storeId } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const filters: any = {};
    if (status) filters.status = status;
    if (storeId) filters.storeId = storeId;

    const { data, total } = await orderRepository.findAllByUser(
      userId,
      filters,
      Number(limit),
      skip
    );

    return { data, total, page: Number(page), limit: Number(limit) };
  }

  // ─── Get single order ────────────────────────────────────────────────────────
  async getOrderById(id: string, userId: string): Promise<IOrderDocument> {
    const order = await orderRepository.findByIdAndUser(id, userId);
    if (!order) {
      throw ApiError.notFound("Order not found.");
    }
    return order;
  }

  // ─── Update order status ─────────────────────────────────────────────────────
  async updateOrderStatus(
    id: string,
    userId: string,
    data: UpdateOrderStatusInput
  ): Promise<IOrderDocument> {
    const order = await orderRepository.findByIdAndUser(id, userId);
    if (!order) {
      throw ApiError.notFound("Order not found.");
    }

    // Guard against invalid status transitions
    const terminalStatuses = ["completed", "cancelled", "refunded"];
    if (terminalStatuses.includes(order.status)) {
      throw ApiError.badRequest(
        `Order is already in a terminal state (${order.status}) and cannot be updated.`
      );
    }

    const updatePayload: any = {
      status: data.status,
    };

    if (data.internalNote) updatePayload.internalNote = data.internalNote;
    if (data.status === "cancelled") updatePayload.cancelledAt = new Date();

    const updated = await orderRepository.updateById(id, updatePayload);
    return updated!;
  }

  // ─── Fulfill order (add tracking info) ──────────────────────────────────────
  async fulfillOrder(
    id: string,
    userId: string,
    data: FulfillOrderInput
  ): Promise<IOrderDocument> {
    const order = await orderRepository.findByIdAndUser(id, userId);
    if (!order) {
      throw ApiError.notFound("Order not found.");
    }

    if (order.status === "cancelled" || order.status === "refunded") {
      throw ApiError.badRequest("Cannot fulfill a cancelled or refunded order.");
    }

    const updatePayload: any = {
      status: "fulfilled",
      fulfilledAt: new Date(),
      tracking: {
        carrier: data.carrier,
        trackingNumber: data.trackingNumber,
        trackingUrl: data.trackingUrl,
        shippedAt: new Date(),
        estimatedDelivery: data.estimatedDelivery
          ? new Date(data.estimatedDelivery)
          : undefined,
      },
    };

    const updated = await orderRepository.updateById(id, updatePayload);
    return updated!;
  }

  // ─── Sync orders from external platform ─────────────────────────────────────
  // This is a stub for the Phase 3 real Shopify/WooCommerce integration.
  // The structure here allows easy plugging of real API calls.
  async syncOrdersFromStore(
    storeId: string,
    userId: string,
    incomingOrders: any[]
  ): Promise<{ created: number; skipped: number }> {
    const store = await storeRepository.findByIdAndUser(storeId, userId);
    if (!store) {
      throw ApiError.notFound("Store not found.");
    }

    let created = 0;
    let skipped = 0;

    for (const rawOrder of incomingOrders) {
      // Deduplication: skip orders already synced
      const exists = await orderRepository.findByExternalId(
        storeId,
        rawOrder.externalOrderId
      );

      if (exists) {
        skipped++;
        continue;
      }

      await orderRepository.create(userId, {
        storeId,
        externalOrderId: rawOrder.externalOrderId,
        externalOrderNumber: rawOrder.externalOrderNumber,
        items: rawOrder.items,
        subtotal: rawOrder.subtotal,
        shippingCost: rawOrder.shippingCost ?? 0,
        taxAmount: rawOrder.taxAmount ?? 0,
        discountAmount: rawOrder.discountAmount ?? 0,
        totalAmount: rawOrder.totalAmount,
        shippingAddress: rawOrder.shippingAddress,
        billingAddress: rawOrder.billingAddress,
        customerNote: rawOrder.customerNote,
        orderedAt: rawOrder.orderedAt,
      });

      created++;
    }

    // Update store sync stats
    await storeRepository.updateSyncStats(storeId, {
      lastSyncedAt: new Date(),
      totalOrdersSynced: store.totalOrdersSynced + created,
    });

    return { created, skipped };
  }

  // ─── Dashboard stats ─────────────────────────────────────────────────────────
  async getOrderStats(userId: string) {
    return orderRepository.getOrderStats(userId);
  }

  // ─── Admin: all orders ───────────────────────────────────────────────────────
  async getAllOrdersAdmin(query: any) {
    const { page = 1, limit = 50, status, storeId } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const filters: any = {};
    if (status) filters.status = status;
    if (storeId) filters.storeId = storeId;

    const { data, total } = await orderRepository.findAllAdmin(filters, Number(limit), skip);
    return { data, total, page: Number(page), limit: Number(limit) };
  }
}

export default new OrderService();
