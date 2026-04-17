import { describe, expect, it } from "vitest";
import {
  DefaultSyncEngine,
  InMemoryEventBus,
  err,
  ok,
  type CoreDb,
  type SyncErrorRecord,
  type SyncQueueItem,
  type SyncStorage
} from "@logiscore/core";
import { createCoreService, type SupabaseLike } from "../services/core.service";

describe("core bootstrap integration", () => {
  it("respeta orden offline: enqueue antes de commit local", async () => {
    const trace: string[] = [];
    const db: CoreDb = {
      async saveBootstrapState() {
        trace.push("db.commit");
      },
      async getBootstrapState() {
        return null;
      }
    };

    const syncStorage: SyncStorage = {
      async addQueueItem() {
        trace.push("sync.enqueue");
      },
      async updateQueueAttempts() {
        trace.push("sync.update_attempts");
      },
      async removeQueueItem() {
        trace.push("sync.remove");
      },
      async getNextQueueItem() {
        return null;
      },
      async addSyncError() {
        trace.push("sync.dlq");
      }
    };

    const syncEngine = new DefaultSyncEngine({
      storage: syncStorage,
      eventBus: new InMemoryEventBus(),
      processor: { async process() { return ok<void>(undefined); } }
    });

    const supabase: SupabaseLike = {
      auth: {
        async getSession() {
          return { data: { session: { user: { id: "u-1" } } }, error: null };
        }
      },
      rpc: async <T>(fn: string) => {
        if (fn === "check_subscriptions") {
          return { data: { isActive: true, status: "active" } as T, error: null };
        }
        return { data: null, error: { message: "rpc_not_found" } };
      },
      from: (table: string) => ({
        select: (columns: string) => ({
          eq: (column: string, value: string) => ({
            maybeSingle: async <T>() => {
              void columns;
              void column;
              void value;
              return table === "tenants"
                ? {
                    data: { id: "tenant-uuid-1", slug: "tenant-slug-1" } as T,
                    error: null
                  }
                : { data: { status: "active" } as T, error: null };
            }
          })
        })
      })
    };

    const service = createCoreService({
      db,
      syncEngine,
      supabase,
      eventBus: new InMemoryEventBus(),
      uuid: () => "fixed-id",
      clock: () => new Date("2026-01-01T00:00:00.000Z")
    });

    await service.bootstrapSession();

    expect(trace).toEqual(["sync.enqueue", "db.commit"]);
  });

  it("mueve a DLQ al quinto fallo", async () => {
    const queue: SyncQueueItem[] = [];
    const syncErrors: SyncErrorRecord[] = [];
    const storage: SyncStorage = {
      async addQueueItem(item) {
        queue.push(item);
      },
      async updateQueueAttempts(id, attempts) {
        const item = queue.find((entry) => entry.id === id);
        if (item) {
          item.attempts = attempts;
        }
      },
      async removeQueueItem(id) {
        const idx = queue.findIndex((entry) => entry.id === id);
        if (idx >= 0) {
          queue.splice(idx, 1);
        }
      },
      async getNextQueueItem() {
        return queue[0] ?? null;
      },
      async addSyncError(error) {
        syncErrors.push(error);
      }
    };

    const syncEngine = new DefaultSyncEngine({
      storage,
      eventBus: new InMemoryEventBus(),
      processor: {
        async process() {
          return err({
            code: "EDGE_DOWN",
            message: "Edge function unavailable",
            retryable: true
          });
        }
      },
      clock: () => new Date("2026-01-01T00:00:00.000Z")
    });

    await syncEngine.enqueue({
      id: "q-fail-1",
      table: "sales",
      operation: "create",
      payload: { id: 1 },
      localId: "local-1",
      tenantId: "tenant-slug-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      attempts: 0
    });

    // Use fake timers to skip the await new Promise(setTimeout)
    const { vi } = await import("vitest");
    vi.useFakeTimers();

    for (let i = 0; i < 5; i += 1) {
      const promise = syncEngine.processNext();
      await vi.runAllTimersAsync();
      await promise;
    }

    vi.useRealTimers();

    expect(queue).toHaveLength(0);
    expect(syncErrors).toHaveLength(1);
  });
});
