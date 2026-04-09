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
  getStatus: vi.fn(() => "idle" as const)
});

const createSupabaseMock = (activeSubscription = true): any => ({
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
    select: () => ({
      eq: () => ({
        maybeSingle: async <T>() => {
          if (table === "tenants") {
            return { data: { id: "tenant-uuid-1", slug: "tenant-demo", name: "Tenant Demo" } as T, error: null };
          }
          if (table === "subscriptions") {
            return { data: { status: activeSubscription ? "active" : "expired" } as T, error: null };
          }
          return { data: null, error: null };
        },
        order: () => ({ eq: () => ({ order: async () => {
          const data = table === "categories"
            ? [
                { local_id: "cat-1", tenant_slug: "tenant-demo", name: "Bebidas", created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" },
                { local_id: "cat-2", tenant_slug: "tenant-demo", name: "Galletas", created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" }
              ]
            : table === "products"
            ? [{ local_id: "prod-1", tenant_slug: "tenant-demo", name: "Agua", sku: "AG001", created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" }]
            : table === "warehouses"
            ? [{ local_id: "wh-1", tenant_slug: "tenant-demo", name: "Principal", created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" }]
            : [];
          return { data, error: null };
        }})})
      })
    })
  })
});

const createCatalogsDbMock = () => ({
  bulkPut: vi.fn(async () => undefined)
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
      catalogsDb: createCatalogsDbMock(),
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
      eventBus,
      catalogsDb: createCatalogsDbMock()
    });

    const result = await service.bootstrapSession();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.subscriptionActive).toBe(false);
    }
    expect(blockedSpy).toHaveBeenCalledTimes(1);
  });

  it("pullCatalogs trae categorias de Supabase y las guarda en Dexie", async () => {
    const catalogsDb = createCatalogsDbMock();
    const eventBus = new InMemoryEventBus();

    const supabaseMock: any = {
      from: (table: string) => {
        if (table === "tenants") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { business_type_id: null },
                  error: null
                })
              })
            })
          };
        }
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                eq: () => ({
                  order: async () => {
                    if (table === "categories") {
                      return {
                        data: [
                          { local_id: "cat-1", tenant_slug: "tenant-demo", name: "Bebidas", created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z" }
                        ],
                        error: null
                      };
                    }
                    return { data: [], error: null };
                  }
                })
              })
            })
          })
        };
      }
    };

    const service = createCoreService({
      db: createDbMock(),
      syncEngine: createSyncEngineMock(),
      supabase: supabaseMock,
      eventBus,
      catalogsDb
    });

    const result = await service.pullCatalogs("tenant-demo");
    expect(result.ok).toBe(true);
  });

  it("pullCatalogs no hace nada si no hay catalogsDb", async () => {
    const eventBus = new InMemoryEventBus();

    const service = createCoreService({
      db: createDbMock(),
      syncEngine: createSyncEngineMock(),
      supabase: createSupabaseMock(true),
      eventBus
    } as Parameters<typeof createCoreService>[0]);

    const result = await service.pullCatalogs("tenant-demo");
    expect(result.ok).toBe(true);
  });
});