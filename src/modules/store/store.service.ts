import storeRepository from "./store.repository";
import ApiError from "@utils/ApiError";
import type { ConnectStoreInput, UpdateStoreInput } from "./store.schema";
import { IStoreDocument } from "./store.model";

class StoreService {
  // ─── Connect a new store ─────────────────────────────────────────────────────
  async connectStore(
    userId: string,
    data: ConnectStoreInput
  ): Promise<IStoreDocument> {
    // Prevent duplicate connections (same URL + platform + user)
    const existing = await storeRepository.findByUrlAndUser(
      data.storeUrl,
      userId,
      data.platform
    );
    if (existing) {
      throw ApiError.conflict(
        `A ${data.platform} store at "${data.storeUrl}" is already connected to your account.`
      );
    }

    const store = await storeRepository.create(userId, data);
    return store;
  }

  // ─── List user's stores ──────────────────────────────────────────────────────
  async getUserStores(userId: string): Promise<IStoreDocument[]> {
    return storeRepository.findAllByUser(userId);
  }

  // ─── Get single store (user-scoped) ─────────────────────────────────────────
  async getStoreById(id: string, userId: string): Promise<IStoreDocument> {
    const store = await storeRepository.findByIdAndUser(id, userId);
    if (!store) {
      throw ApiError.notFound("Store not found or you do not have access to it.");
    }
    return store;
  }

  // ─── Update store settings ───────────────────────────────────────────────────
  async updateStore(
    id: string,
    userId: string,
    data: UpdateStoreInput
  ): Promise<IStoreDocument> {
    const store = await storeRepository.findByIdAndUser(id, userId);
    if (!store) {
      throw ApiError.notFound("Store not found.");
    }

    const updated = await storeRepository.update(id, data);
    return updated!;
  }

  // ─── Disconnect / delete store ───────────────────────────────────────────────
  async disconnectStore(id: string, userId: string): Promise<void> {
    const store = await storeRepository.findByIdAndUser(id, userId);
    if (!store) {
      throw ApiError.notFound("Store not found.");
    }
    await storeRepository.delete(id);
  }

  // ─── Trigger Sync (stub — real Shopify/WooCommerce calls go here) ────────────
  async syncStore(id: string, userId: string): Promise<{ message: string }> {
    const store = await storeRepository.findByIdAndUser(id, userId);
    if (!store) {
      throw ApiError.notFound("Store not found.");
    }

    if (store.status === "disconnected") {
      throw ApiError.badRequest(
        "Cannot sync a disconnected store. Please reconnect first."
      );
    }

    // ─── TODO: Platform-specific sync logic ───────────────────────────────────
    // Phase 3 will implement actual Shopify / WooCommerce API calls here.
    // For now we update the lastSyncedAt timestamp and mark as active.
    await storeRepository.updateSyncStats(id, {
      lastSyncedAt: new Date(),
      status: "active",
      syncErrors: [],
    });

    return { message: `Sync initiated for store "${store.name}". Orders and products will be updated shortly.` };
  }

  // ─── Admin: all stores ───────────────────────────────────────────────────────
  async getAllStoresAdmin(): Promise<IStoreDocument[]> {
    return storeRepository.findAllAdmin();
  }
}

export default new StoreService();
