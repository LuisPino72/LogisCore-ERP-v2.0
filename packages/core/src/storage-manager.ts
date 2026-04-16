import type { AppError } from "./errors";
import { ok, type Result } from "./result";

export interface StorageStats {
  usedBytes: number;
  quotaBytes: number;
  usagePercent: number;
  tableSizes: Record<string, number>;
}

const DEFAULT_MAX_STORAGE_PERCENT = 80;
const AGGRESSIVE_MAX_STORAGE_PERCENT = 90;
const CRITICAL_STORAGE_PERCENT = 95;

export class StorageManager {
  private readonly dbName: string;
  private cache: StorageStats | null = null;
  private lastFetch: number = 0;
  private readonly cacheTtlMs = 5000;

  constructor(dbName: string) {
    this.dbName = dbName;
  }

  async getStorageEstimate(): Promise<StorageStats> {
    if (this.cache && Date.now() - this.lastFetch < this.cacheTtlMs) {
      return this.cache;
    }

    if (!navigator.storage || !navigator.storage.estimate) {
      return {
        usedBytes: 0,
        quotaBytes: 0,
        usagePercent: 0,
        tableSizes: {}
      };
    }

    try {
      const estimate = await navigator.storage.estimate();
      const usedBytes = estimate.usage ?? 0;
      const quotaBytes = estimate.quota ?? 0;
      const usagePercent = quotaBytes > 0 ? (usedBytes / quotaBytes) * 100 : 0;

      this.cache = {
        usedBytes,
        quotaBytes,
        usagePercent,
        tableSizes: {}
      };
      this.lastFetch = Date.now();

      return this.cache;
    } catch (error) {
      console.error("Error getting storage estimate:", error);
      return {
        usedBytes: 0,
        quotaBytes: 0,
        usagePercent: 0,
        tableSizes: {}
      };
    }
  }

  isStorageCritical(): boolean {
    if (!this.cache) return false;
    return this.cache.usagePercent >= CRITICAL_STORAGE_PERCENT;
  }

  isStorageAggressive(): boolean {
    if (!this.cache) return false;
    return this.cache.usagePercent >= AGGRESSIVE_MAX_STORAGE_PERCENT;
  }

  isStorageFull(): boolean {
    if (!this.cache) return false;
    return this.cache.usagePercent >= DEFAULT_MAX_STORAGE_PERCENT;
  }

  async requestPersistentStorage(): Promise<boolean> {
    if (!navigator.storage || !navigator.storage.persist) {
      return false;
    }

    try {
      const isPersisted = await navigator.storage.persist();
      return isPersisted;
    } catch (error) {
      console.error("Error requesting persistent storage:", error);
      return false;
    }
  }

  async isStoragePersistent(): Promise<boolean> {
    if (!navigator.storage || !navigator.storage.persisted) {
      return false;
    }

    try {
      return await navigator.storage.persisted();
    } catch {
      return false;
    }
  }

  async cleanupOldTransactions(
    db: IDBDatabase,
    maxAgeDays: number = 365
  ): Promise<Result<number, AppError>> {
    const transactionalTables = Array.from(db.objectStoreNames).filter(
      name => !name.startsWith("sync_") && !name.startsWith("config_")
    );
    let totalDeleted = 0;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
    const cutoffISO = cutoffDate.toISOString();

    for (const tableName of transactionalTables) {
      try {
        const store = db.transaction(tableName, "readwrite").objectStore(tableName);
        if (!store.indexNames.contains("createdAt")) continue;

        const index = store.index("createdAt");
        const range = IDBKeyRange.upperBound(cutoffISO);

        const request = index.openCursor(range);

        await new Promise<void>((resolve, reject) => {
          request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result;
            if (cursor) {
              cursor.delete();
              totalDeleted++;
              cursor.continue();
            } else {
              resolve();
            }
          };
          request.onerror = () => reject(request.error);
        });
      } catch (error) {
        console.warn(`Error cleaning table ${tableName}:`, error);
      }
    }

    this.cache = null;

    return ok(totalDeleted);
  }

  async performMaintenance(db: IDBDatabase): Promise<Result<void, AppError>> {
    const stats = await this.getStorageEstimate();

    if (stats.usagePercent < DEFAULT_MAX_STORAGE_PERCENT) {
      return ok(undefined);
    }

    if (this.isStorageCritical()) {
      const deleteResult = await this.cleanupOldTransactions(db, 90);
      if (deleteResult.ok && deleteResult.data > 0) {
        console.log(`Emergency cleanup: deleted ${deleteResult.data} old transaction records`);
      }
    } else if (this.isStorageAggressive()) {
      const deleteResult = await this.cleanupOldTransactions(db, 180);
      if (deleteResult.ok && deleteResult.data > 0) {
        console.log(`Aggressive cleanup: deleted ${deleteResult.data} old transaction records`);
      }
    } else {
      const deleteResult = await this.cleanupOldTransactions(db, 365);
      if (deleteResult.ok && deleteResult.data > 0) {
        console.log(`Routine cleanup: deleted ${deleteResult.data} old transaction records`);
      }
    }

    return ok(undefined);
  }
}

export function createStorageManager(dbName: string = "logiscore_erp"): StorageManager {
  return new StorageManager(dbName);
}

export const globalStorageManager = createStorageManager();