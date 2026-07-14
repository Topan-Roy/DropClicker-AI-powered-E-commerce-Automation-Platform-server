import Store, { IStoreDocument } from "./store.model";
import type { ConnectStoreInput, UpdateStoreInput } from "./store.schema";

class StoreRepository {
  async create(
    userId: string,
    data: ConnectStoreInput
  ): Promise<IStoreDocument> {
    return Store.create({ userId, ...data });
  }

  async findAllByUser(userId: string): Promise<IStoreDocument[]> {
    return Store.find({ userId }).sort({ createdAt: -1 });
  }

  async findById(id: string): Promise<IStoreDocument | null> {
    return Store.findById(id);
  }

  async findByIdAndUser(
    id: string,
    userId: string
  ): Promise<IStoreDocument | null> {
    return Store.findOne({ _id: id, userId });
  }

  async findByUrlAndUser(
    storeUrl: string,
    userId: string,
    platform: string
  ): Promise<IStoreDocument | null> {
    return Store.findOne({ storeUrl, userId, platform });
  }

  async update(
    id: string,
    data: UpdateStoreInput
  ): Promise<IStoreDocument | null> {
    return Store.findByIdAndUpdate(id, data, { new: true });
  }

  async updateSyncStats(
    id: string,
    stats: Partial<{
      lastSyncedAt: Date;
      totalProductsSynced: number;
      totalOrdersSynced: number;
      syncErrors: string[];
      status: IStoreDocument["status"];
    }>
  ): Promise<IStoreDocument | null> {
    return Store.findByIdAndUpdate(id, stats, { new: true });
  }

  async delete(id: string): Promise<IStoreDocument | null> {
    return Store.findByIdAndDelete(id);
  }

  // Admin: all stores across all users
  async findAllAdmin(
    filter: Record<string, any> = {}
  ): Promise<IStoreDocument[]> {
    return Store.find(filter).populate("userId", "name email").sort({ createdAt: -1 });
  }
}

export default new StoreRepository();
