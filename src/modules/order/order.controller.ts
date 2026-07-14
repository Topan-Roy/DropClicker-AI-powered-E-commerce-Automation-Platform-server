import { Request, Response } from "express";
import orderService from "./order.service";
import ApiResponse from "@utils/ApiResponse";
import { HTTP_STATUS } from "@constants/index";
import type { CreateOrderInput, FulfillOrderInput, UpdateOrderStatusInput } from "./order.schema";

// =============================================================================
// Order Controller — HTTP adapter only
// =============================================================================

class OrderController {
  // POST /api/v1/orders
  async createOrder(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const order = await orderService.createOrder(userId, req.body as CreateOrderInput);
    new ApiResponse(HTTP_STATUS.CREATED, order, "Order created successfully").send(res);
  }

  // GET /api/v1/orders
  async getUserOrders(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const result = await orderService.getUserOrders(userId, req.query);
    new ApiResponse(HTTP_STATUS.OK, result, "Orders retrieved successfully").send(res);
  }

  // GET /api/v1/orders/stats
  async getOrderStats(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const stats = await orderService.getOrderStats(userId);
    new ApiResponse(HTTP_STATUS.OK, stats, "Order statistics retrieved").send(res);
  }

  // GET /api/v1/orders/:id
  async getOrderById(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const order = await orderService.getOrderById(req.params["id"] as string, userId);
    new ApiResponse(HTTP_STATUS.OK, order, "Order retrieved successfully").send(res);
  }

  // PATCH /api/v1/orders/:id/status
  async updateOrderStatus(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const order = await orderService.updateOrderStatus(
      req.params["id"] as string,
      userId,
      req.body as UpdateOrderStatusInput
    );
    new ApiResponse(HTTP_STATUS.OK, order, "Order status updated successfully").send(res);
  }

  // POST /api/v1/orders/:id/fulfill
  async fulfillOrder(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const order = await orderService.fulfillOrder(
      req.params["id"] as string,
      userId,
      req.body as FulfillOrderInput
    );
    new ApiResponse(HTTP_STATUS.OK, order, "Order fulfilled and tracking information saved").send(res);
  }

  // POST /api/v1/orders/sync
  async syncOrders(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { storeId, orders } = req.body as { storeId: string; orders: any[] };

    if (!storeId || !Array.isArray(orders)) {
      res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "storeId and orders array are required",
      });
      return;
    }

    const result = await orderService.syncOrdersFromStore(storeId, userId, orders);
    new ApiResponse(
      HTTP_STATUS.OK,
      result,
      `Sync complete: ${result.created} new orders imported, ${result.skipped} skipped (already synced).`
    ).send(res);
  }

  // GET /api/v1/orders/admin/all   (Admin only)
  async getAllOrdersAdmin(req: Request, res: Response): Promise<void> {
    const result = await orderService.getAllOrdersAdmin(req.query);
    new ApiResponse(HTTP_STATUS.OK, result, "All orders retrieved").send(res);
  }
}

export default new OrderController();
