import { createAppError, type AppError } from "./errors";
import { err, ok, type Result } from "./result";
import type { SyncMetadata, ConflictResolver, SyncTableConfig, SyncConflict, SyncPriority } from "./types";

export class DefaultConflictResolver implements ConflictResolver {
  async resolve(conflict: SyncConflict): Promise<Result<Record<string, unknown>, AppError>> {
    switch (conflict.strategy) {
      case "LWW":
        return ok(conflict.remoteData);

      case "SUM_MERGE": {
        const merged = { ...conflict.remoteData };
        const SCALE = 10000;
        for (const key in conflict.localData) {
          if (
            typeof conflict.localData[key] === "number" &&
            typeof conflict.remoteData[key] === "number"
          ) {
            merged[key] = Math.round(
              (conflict.localData[key] + conflict.remoteData[key]) * SCALE
            ) / SCALE;
          }
        }
        return ok(merged);
      }

      case "MANUAL":
        return err(
          createAppError({
            code: "SYNC_CONFLICT_MANUAL",
            message: `Conflicto en ${conflict.table} requiere resolución manual. Local: ${JSON.stringify(conflict.localData)}, Remoto: ${JSON.stringify(conflict.remoteData)}`,
            retryable: false,
            context: {
              table: conflict.table,
              localId: conflict.localId,
              localData: conflict.localData,
              remoteData: conflict.remoteData
            }
          })
        );

      default:
        return ok(conflict.remoteData);
    }
  }
}

export class SyncMetadataService {
  private getMetadataKey(tableName: string, tenantId: string): string {
    return `${tenantId}_${tableName}`;
  }

  async getLastSyncTimestamp(
    tableName: string,
    tenantId: string,
    getFn: (key: string) => Promise<SyncMetadata | undefined>
  ): Promise<string> {
    const key = this.getMetadataKey(tableName, tenantId);
    const metadata = await getFn(key);
    return metadata?.lastSyncTimestamp ?? "1970-01-01T00:00:00.000Z";
  }

  async updateSyncMetadata(
    tableName: string,
    tenantId: string,
    timestamp: string,
    version: number,
    setFn: (metadata: SyncMetadata) => Promise<void>
  ): Promise<Result<void, AppError>> {
    try {
      const metadata: SyncMetadata = {
        tableName: this.getMetadataKey(tableName, tenantId),
        tenantId,
        lastSyncTimestamp: timestamp,
        lastSyncVersion: version,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await setFn(metadata);
      return ok(undefined);
    } catch (cause) {
      return err(
        createAppError({
          code: "SYNC_METADATA_UPDATE_FAILED",
          message: "Error al actualizar metadatos de sincronización",
          retryable: true,
          cause
        })
      );
    }
  }
}

export const conflictResolver = new DefaultConflictResolver();
export const syncMetadataService = new SyncMetadataService();

export function getSyncPriority(priority: SyncPriority): number {
  switch (priority) {
    case "CRITICAL":
      return 0;
    case "HIGH":
      return 1;
    case "LOW":
      return 2;
    default:
      return 3;
  }
}

export function sortByPriority<T extends { table: string }>(
  items: T[],
  configs: Record<string, SyncTableConfig>
): T[] {
  return [...items].sort((a, b) => {
    const priorityA = getSyncPriority(configs[a.table]?.priority ?? "LOW");
    const priorityB = getSyncPriority(configs[b.table]?.priority ?? "LOW");
    return priorityA - priorityB;
  });
}

export async function resolveConflictWithStrategy(
  conflict: SyncConflict
): Promise<Result<Record<string, unknown>, AppError>> {
  return conflictResolver.resolve(conflict);
}