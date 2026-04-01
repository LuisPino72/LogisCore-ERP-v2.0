import { describe, expect, it, vi } from "vitest";
import { InMemoryEventBus } from "../src/event-bus";
import { err, ok } from "../src/result";
import { DefaultSyncEngine } from "../src/sync-engine";
import type { SyncErrorRecord, SyncQueueItem, SyncStorage } from "../src/types";

const createMemorySyncStorage = () => {
  const queue: SyncQueueItem[] = [];
  const syncErrors: SyncErrorRecord[] = [];

  const storage: SyncStorage = {
    async addQueueItem(item) {
      queue.push(item);
    },
    async updateQueueAttempts(id, attempts) {
      const item = queue.find((q) => q.id === id);
      if (item) {
        item.attempts = attempts;
      }
    },
    async removeQueueItem(id) {
      const index = queue.findIndex((q) => q.id === id);
      if (index >= 0) {
        queue.splice(index, 1);
      }
    },
    async getNextQueueItem() {
      return queue[0] ?? null;
    },
    async addSyncError(error) {
      syncErrors.push(error);
    }
  };

  return { storage, queue, syncErrors };
};

describe("DefaultSyncEngine", () => {
  it("mueve a DLQ luego de 5 intentos fallidos", async () => {
    const { storage, queue, syncErrors } = createMemorySyncStorage();
    const eventBus = new InMemoryEventBus();
    const dlqSpy = vi.fn();
    eventBus.on("SYNC.DLQ_ITEM_MOVED", dlqSpy);

    const engine = new DefaultSyncEngine({
      storage,
      eventBus,
      processor: {
        async process() {
          return err({
            code: "SYNC_FAILURE",
            message: "remote down",
            retryable: true
          });
        }
      },
      clock: () => new Date("2026-01-01T00:00:00.000Z")
    });

    await engine.enqueue({
      id: "q1",
      table: "sales",
      operation: "create",
      payload: { total: 10 },
      localId: "l1",
      tenantId: "tenant-demo",
      createdAt: "2026-01-01T00:00:00.000Z",
      attempts: 0
    });

    for (let i = 0; i < 5; i += 1) {
      await engine.processNext();
    }

    expect(queue).toHaveLength(0);
    expect(syncErrors).toHaveLength(1);
    expect(dlqSpy).toHaveBeenCalledTimes(1);
  });

  it("elimina item cuando el procesamiento es exitoso", async () => {
    const { storage, queue } = createMemorySyncStorage();
    const engine = new DefaultSyncEngine({
      storage,
      eventBus: new InMemoryEventBus(),
      processor: {
        async process() {
          return ok<void>(undefined);
        }
      }
    });

    await engine.enqueue({
      id: "q2",
      table: "products",
      operation: "update",
      payload: { name: "A" },
      localId: "l2",
      tenantId: "tenant-demo",
      createdAt: "2026-01-01T00:00:00.000Z",
      attempts: 0
    });

    const result = await engine.processNext();
    expect(result.ok).toBe(true);
    expect(queue).toHaveLength(0);
  });
});
