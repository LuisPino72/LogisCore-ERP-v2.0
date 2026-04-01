import { describe, expect, it, vi } from "vitest";
import { InMemoryEventBus, ok, type CoreDb, type SyncEngine } from "@logiscore/core";
import { createCoreService, type SupabaseLike } from "../services/core.service";

const createDbMock = (): CoreDb => ({
  saveBootstrapState: vi.fn(async () => undefined),
  getBootstrapState: vi.fn(async () => null)
});

const createSyncEngineMock = (): SyncEngine => ({
  enqueue: vi.fn(async () => ok<void>(undefined)),
  processNext: vi.fn(async () => ok<"processed" | "skipped">("skipped")),
  startPeriodicSync: vi.fn(),
  stopPeriodicSync: vi.fn(),
  getStatus: vi.fn(() => "idle")
});

const createSupabaseMock = (activeSubscription = true): SupabaseLike => ({
  auth: {
    getSession: vi.fn(async () => ({
      data: { session: { user: { id: "user-1" } } },
      error: null
    }))
  },
  rpc: vi.fn(async (fn: string) => {
    if (fn === "check_subscriptions") {
      return {
        data: { isActive: activeSubscription, status: activeSubscription ? "active" : "expired" },
        error: null
      };
    }
    return { data: null, error: { message: "rpc_not_found" } };
  }),
  from: (table: string) => ({
    select: (columns: string) => ({
      eq: (column: string, value: string) => ({
        maybeSingle: async <T>() => {
          void columns;
          void column;
          void value;
          if (table === "tenants") {
            return {
              data: { id: "tenant-uuid-1", slug: "tenant-demo" } as T,
              error: null
            };
          }
          if (table === "subscriptions") {
            return {
              data: { status: activeSubscription ? "active" : "expired" } as T,
              error: null
            };
          }
          return { data: null, error: null };
        }
      })
    })
  })
});

describe("core.service", () => {
  it("bootstrapSession emite eventos y guarda estado", async () => {
    const db = createDbMock();
    const syncEngine = createSyncEngineMock();
    const eventBus = new InMemoryEventBus();
    const completedSpy = vi.fn();
    eventBus.on("CORE.BOOTSTRAP_COMPLETED", completedSpy);

    const service = createCoreService({
      db,
      syncEngine,
      supabase: createSupabaseMock(true),
      eventBus,
      clock: () => new Date("2026-01-01T00:00:00.000Z"),
      uuid: () => "uuid-1"
    });

    const result = await service.bootstrapSession();
    expect(result.ok).toBe(true);
    expect(syncEngine.enqueue).toHaveBeenCalledTimes(1);
    expect(db.saveBootstrapState).toHaveBeenCalledTimes(1);
    expect(completedSpy).toHaveBeenCalledTimes(1);
  });

  it("marca bloqueado cuando la suscripcion no esta activa", async () => {
    const eventBus = new InMemoryEventBus();
    const blockedSpy = vi.fn();
    eventBus.on("SUBSCRIPTION.BLOCKED", blockedSpy);

    const service = createCoreService({
      db: createDbMock(),
      syncEngine: createSyncEngineMock(),
      supabase: createSupabaseMock(false),
      eventBus
    });

    const result = await service.bootstrapSession();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.subscriptionActive).toBe(false);
    }
    expect(blockedSpy).toHaveBeenCalledTimes(1);
  });
});
