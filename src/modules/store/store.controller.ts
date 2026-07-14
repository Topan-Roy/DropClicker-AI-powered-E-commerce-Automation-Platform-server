import { Request, Response } from "express";
import storeService from "./store.service";
import ApiResponse from "@utils/ApiResponse";
import { HTTP_STATUS } from "@constants/index";
import type { ConnectStoreInput, UpdateStoreInput } from "./store.schema";

// =============================================================================
// Store Controller — HTTP adapter only
// =============================================================================

class StoreController {
  // POST /api/v1/stores
  async connectStore(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const body = req.body as ConnectStoreInput;

    const store = await storeService.connectStore(userId, body);

    new ApiResponse(
      HTTP_STATUS.CREATED,
      store,
      `"${store.name}" connected successfully. Run a sync to import products and orders.`
    ).send(res);
  }

  // GET /api/v1/stores
  async getUserStores(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const stores = await storeService.getUserStores(userId);
    new ApiResponse(HTTP_STATUS.OK, stores, "Stores retrieved successfully").send(res);
  }

  // GET /api/v1/stores/:id
  async getStoreById(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const store = await storeService.getStoreById(req.params["id"] as string, userId);
    new ApiResponse(HTTP_STATUS.OK, store, "Store retrieved successfully").send(res);
  }

  // PATCH /api/v1/stores/:id
  async updateStore(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const body = req.body as UpdateStoreInput;
    const store = await storeService.updateStore(req.params["id"] as string, userId, body);
    new ApiResponse(HTTP_STATUS.OK, store, "Store settings updated").send(res);
  }

  // DELETE /api/v1/stores/:id
  async disconnectStore(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    await storeService.disconnectStore(req.params["id"] as string, userId);
    new ApiResponse(HTTP_STATUS.OK, null, "Store disconnected successfully").send(res);
  }

  // POST /api/v1/stores/:id/sync
  async syncStore(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const result = await storeService.syncStore(req.params["id"] as string, userId);
    new ApiResponse(HTTP_STATUS.OK, result, result.message).send(res);
  }

  // GET /api/v1/stores/admin/all   (Admin only)
  async getAllStoresAdmin(req: Request, res: Response): Promise<void> {
    const stores = await storeService.getAllStoresAdmin();
    new ApiResponse(HTTP_STATUS.OK, stores, "All stores retrieved").send(res);
  }
}

export default new StoreController();
