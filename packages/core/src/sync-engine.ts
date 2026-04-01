import { createAppError } from "./errors";
import { err, ok } from "./result";
import type {
  EventBus,
  SyncEngine,
  SyncProcessor,
  SyncStatus,
  SyncStorage
} from "./types";

interface SyncEngineDependencies {
  storage: SyncStorage;
  processor: SyncProcessor;
  eventBus: EventBus;
  clock?: () => Date;
  maxAttempts?: number;
}

export class DefaultSyncEngine implements SyncEngine {
  private readonly storage: SyncStorage;
  private readonly processor: SyncProcessor;
  private readonly eventBus: EventBus;
  private readonly clock: () => Date;
  private readonly maxAttempts: number;
  private status: SyncStatus = "idle";
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  constructor({
    storage,
    processor,
    eventBus,
    clock = () => new Date(),
    maxAttempts = 5
  }: SyncEngineDependencies) {
    this.storage = storage;
    this.processor = processor;
    this.eventBus = eventBus;
    this.clock = clock;
    this.maxAttempts = maxAttempts;
  }

  async enqueue(item: Parameters<SyncStorage["addQueueItem"]>[0]) {
    try {
      await this.storage.addQueueItem(item);
      this.eventBus.emit("SYNC.QUEUE_ITEM_ENQUEUED", { itemId: item.id });
      return ok<void>(undefined);
    } catch (cause) {
      this.status = "error";
      this.eventBus.emit("SYNC.STATUS_CHANGED", { status: this.status });
      return err(
        createAppError({
          code: "SYNC_ENQUEUE_FAILED",
          message: "No se pudo encolar el item de sincronizacion.",
          retryable: true,
          cause
        })
      );
    }
  }

  async processNext() {
    const nextItem = await this.storage.getNextQueueItem();
    if (!nextItem) {
      return ok<"processed" | "skipped">("skipped");
    }

    this.status = "running";
    this.eventBus.emit("SYNC.STATUS_CHANGED", { status: this.status });

    const processed = await this.processor.process(nextItem);
    if (processed.ok) {
      await this.storage.removeQueueItem(nextItem.id);
      this.status = "idle";
      this.eventBus.emit("SYNC.STATUS_CHANGED", { status: this.status });
      return ok<"processed" | "skipped">("processed");
    }

    const nextAttempts = nextItem.attempts + 1;
    if (nextAttempts >= this.maxAttempts) {
      await this.storage.removeQueueItem(nextItem.id);
      await this.storage.addSyncError({
        id: crypto.randomUUID(),
        queueItemId: nextItem.id,
        tenantId: nextItem.tenantId,
        table: nextItem.table,
        operation: nextItem.operation,
        payload: nextItem.payload,
        reason: processed.error.message,
        failedAt: this.clock().toISOString()
      });
      this.eventBus.emit("SYNC.DLQ_ITEM_MOVED", { itemId: nextItem.id });
      this.status = "error";
      this.eventBus.emit("SYNC.STATUS_CHANGED", { status: this.status });
      return err(processed.error);
    }

    await this.storage.updateQueueAttempts(nextItem.id, nextAttempts);
    this.status = "error";
    this.eventBus.emit("SYNC.STATUS_CHANGED", { status: this.status });
    return err(processed.error);
  }

  startPeriodicSync(intervalMs = 15_000): void {
    if (this.intervalHandle) {
      return;
    }
    this.status = "idle";
    this.eventBus.emit("SYNC.STATUS_CHANGED", { status: this.status });

    this.intervalHandle = setInterval(() => {
      void this.processNext();
    }, intervalMs);
  }

  stopPeriodicSync(): void {
    if (!this.intervalHandle) {
      return;
    }
    clearInterval(this.intervalHandle);
    this.intervalHandle = null;
    this.status = "stopped";
    this.eventBus.emit("SYNC.STATUS_CHANGED", { status: this.status });
  }

  getStatus(): SyncStatus {
    return this.status;
  }
}
