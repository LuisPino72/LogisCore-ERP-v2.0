import type { AppError } from "./errors";
import type { Result } from "./result";

export type EventName = `${string}.${string}`;

export interface EventBus {
  emit<TPayload = unknown>(event: EventName, payload: TPayload): void;
  on<TPayload = unknown>(
    event: EventName,
    handler: (payload: TPayload) => void
  ): () => void;
}

export type SyncOperation = "create" | "update" | "delete";

export interface SyncQueueItem {
  id: string;
  table: string;
  operation: SyncOperation;
  payload: Record<string, unknown>;
  localId: string;
  tenantId: string;
  createdAt: string;
  attempts: number;
}

export interface SyncErrorRecord {
  id: string;
  queueItemId: string;
  tenantId: string;
  table: string;
  operation: SyncOperation;
  payload: Record<string, unknown>;
  reason: string;
  failedAt: string;
}

export interface SyncStorage {
  addQueueItem(item: SyncQueueItem): Promise<void>;
  updateQueueAttempts(id: string, attempts: number): Promise<void>;
  removeQueueItem(id: string): Promise<void>;
  getNextQueueItem(): Promise<SyncQueueItem | null>;
  addSyncError(error: SyncErrorRecord): Promise<void>;
}

export interface SyncProcessor {
  process(item: SyncQueueItem): Promise<Result<void, AppError>>;
}

export interface SyncEngine {
  enqueue(item: SyncQueueItem): Promise<Result<void, AppError>>;
  processNext(): Promise<Result<"processed" | "skipped", AppError>>;
  startPeriodicSync(intervalMs?: number): void;
  stopPeriodicSync(): void;
  getStatus(): SyncStatus;
}

export type SyncStatus = "idle" | "running" | "stopped" | "error";

export interface CoreBootstrapState {
  id: string;
  tenantId: string;
  userId: string;
  bootstrappedAt: string;
}

export interface CoreDb {
  saveBootstrapState(state: CoreBootstrapState): Promise<void>;
  getBootstrapState(id: string): Promise<CoreBootstrapState | null>;
}

export interface SyncMetadata {
  tableName: string;
  tenantId: string;
  lastSyncTimestamp: string;
  lastSyncVersion: number;
  createdAt: string;
  updatedAt: string;
}

export type ConflictResolutionStrategy = "LWW" | "SUM_MERGE" | "MANUAL";

export interface SyncConflict {
  localId: string;
  table: string;
  localData: Record<string, unknown>;
  remoteData: Record<string, unknown>;
  strategy: ConflictResolutionStrategy;
}

export interface ConflictResolver {
  resolve(conflict: SyncConflict): Promise<Result<Record<string, unknown>, AppError>>;
}

export type SyncPriority = "CRITICAL" | "HIGH" | "LOW";

export interface SyncTableConfig {
  tableName: string;
  priority: SyncPriority;
  incremental: boolean;
  conflictStrategy: ConflictResolutionStrategy;
}

export const DEFAULT_SYNC_TABLE_CONFIGS: Record<string, SyncTableConfig> = {
  exchange_rates: { tableName: "exchange_rates", priority: "CRITICAL", incremental: true, conflictStrategy: "LWW" },
  tax_rules: { tableName: "tax_rules", priority: "CRITICAL", incremental: true, conflictStrategy: "LWW" },
  products: { tableName: "products", priority: "HIGH", incremental: true, conflictStrategy: "LWW" },
  categories: { tableName: "categories", priority: "HIGH", incremental: true, conflictStrategy: "LWW" },
  warehouses: { tableName: "warehouses", priority: "HIGH", incremental: true, conflictStrategy: "LWW" },
  suppliers: { tableName: "suppliers", priority: "HIGH", incremental: true, conflictStrategy: "LWW" },
  sales: { tableName: "sales", priority: "LOW", incremental: false, conflictStrategy: "MANUAL" },
  purchases: { tableName: "purchases", priority: "LOW", incremental: false, conflictStrategy: "MANUAL" },
  stock_movements: { tableName: "stock_movements", priority: "LOW", incremental: false, conflictStrategy: "MANUAL" },
};
