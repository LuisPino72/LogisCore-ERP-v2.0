import Dexie, { type EntityTable } from "dexie";
import type {
  CoreBootstrapState,
  CoreDb,
  SyncErrorRecord,
  SyncQueueItem,
  SyncStorage
} from "@logiscore/core";

interface SyncQueueEntity extends SyncQueueItem {
  status: "pending";
}

export interface CategoryRecord {
  localId: string;
  tenantId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductPresentationRecord {
  id: string;
  tenantId: string;
  productLocalId: string;
  name: string;
  factor: number;
  barcode?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface ProductRecord {
  localId: string;
  tenantId: string;
  name: string;
  categoryId?: string;
  visible: boolean;
  defaultPresentationId?: string;
  createdAt: string;
  updatedAt: string;
}

export class LogisCoreDexie extends Dexie {
  bootstrap_state!: EntityTable<CoreBootstrapState, "id">;
  sync_queue!: EntityTable<SyncQueueEntity, "id">;
  sync_errors!: EntityTable<SyncErrorRecord, "id">;
  categories!: EntityTable<CategoryRecord, "localId">;
  products!: EntityTable<ProductRecord, "localId">;
  product_presentations!: EntityTable<ProductPresentationRecord, "id">;

  constructor() {
    super("logiscore_erp");
    this.version(1).stores({
      bootstrap_state: "&id, tenantId, userId, bootstrappedAt",
      sync_queue: "&id, tenantId, table, operation, createdAt, attempts, status",
      sync_errors: "&id, queueItemId, tenantId, failedAt"
    });
    this.version(2).stores({
      bootstrap_state: "&id, tenantId, userId, bootstrappedAt",
      sync_queue: "&id, tenantId, table, operation, createdAt, attempts, status",
      sync_errors: "&id, queueItemId, tenantId, failedAt",
      categories: "&localId, tenantId, name, createdAt",
      products:
        "&localId, tenantId, categoryId, visible, defaultPresentationId, createdAt",
      product_presentations: "&id, tenantId, productLocalId, name, createdAt"
    });
  }
}

export class DexieCoreDbAdapter implements CoreDb {
  constructor(private readonly db: LogisCoreDexie) {}

  async saveBootstrapState(state: CoreBootstrapState): Promise<void> {
    await this.db.bootstrap_state.put(state);
  }

  async getBootstrapState(id: string): Promise<CoreBootstrapState | null> {
    const state = await this.db.bootstrap_state.get(id);
    return state ?? null;
  }
}

export class DexieSyncStorageAdapter implements SyncStorage {
  constructor(private readonly db: LogisCoreDexie) {}

  async addQueueItem(item: SyncQueueItem): Promise<void> {
    await this.db.sync_queue.put({ ...item, status: "pending" });
  }

  async updateQueueAttempts(id: string, attempts: number): Promise<void> {
    await this.db.sync_queue.update(id, { attempts });
  }

  async removeQueueItem(id: string): Promise<void> {
    await this.db.sync_queue.delete(id);
  }

  async getNextQueueItem(): Promise<SyncQueueItem | null> {
    const next = await this.db.sync_queue.orderBy("createdAt").first();
    if (!next) {
      return null;
    }
    const { status, ...item } = next;
    void status;
    return item;
  }

  async addSyncError(error: SyncErrorRecord): Promise<void> {
    await this.db.sync_errors.put(error);
  }
}

export const db = new LogisCoreDexie();
