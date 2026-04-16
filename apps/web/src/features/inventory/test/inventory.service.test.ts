import { describe, expect, it, vi } from "vitest";
import { InMemoryEventBus, ok, type SyncEngine } from "@logiscore/core";
import {
  createInventoryService,
  type InventoryDb
} from "../services/inventory.service";
import type {
  InventoryCount,
  ProductSizeColor,
  StockMovement,
  Warehouse
} from "../types/inventory.types";

const createInventoryDbMock = (): InventoryDb => {
  const warehouses = new Map<string, Warehouse>();
  const movements = new Map<string, StockMovement>();
  const counts = new Map<string, InventoryCount>();
  const sizeColors = new Map<string, ProductSizeColor>();

  return {
    async createWarehouse(item) {
      warehouses.set(item.localId, item);
    },
    async listWarehouses(tenantId) {
      return [...warehouses.values()].filter((item) => item.tenantId === tenantId);
    },
    async createProductSizeColor(item) {
      sizeColors.set(item.localId, item);
    },
    async listProductSizeColors(tenantId) {
      return [...sizeColors.values()].filter((item) => item.tenantId === tenantId);
    },
    async createStockMovement(item) {
      movements.set(item.localId, item);
    },
    async listStockMovements(tenantId) {
      return [...movements.values()].filter((item) => item.tenantId === tenantId);
    },
    async getStockBalance(tenantId, productLocalId, warehouseLocalId) {
      const incoming = new Set<StockMovement["movementType"]>([
        "purchase_in",
        "adjustment_in",
        "production_in",
        "transfer_in",
        "count_adjustment"
      ]);
      return [...movements.values()]
        .filter(
          (item) =>
            item.tenantId === tenantId &&
            item.productLocalId === productLocalId &&
            item.warehouseLocalId === warehouseLocalId
        )
        .reduce((acc, item) => {
          const signed = incoming.has(item.movementType)
            ? item.quantity
            : -item.quantity;
          return acc + signed;
        }, 0);
    },
    async createInventoryCount(item) {
      counts.set(item.localId, item);
    },
    async listInventoryCounts(tenantId) {
      return [...counts.values()].filter((item) => item.tenantId === tenantId);
    },
    async getInventoryCountById(tenantId, localId) {
      const item = counts.get(localId);
      return item?.tenantId === tenantId ? item : null;
    },
    async postInventoryCount(tenantId, localId, updatedCount, movement) {
      const item = counts.get(localId);
      if (!item || item.tenantId !== tenantId) {
        return;
      }
      counts.set(localId, updatedCount);
      if (movement) {
        movements.set(movement.localId, movement);
      }
    },
    async listInventoryLots(tenantId) {
      return [];
    },
    async createInventoryLot(lot) {
      // No-op for tests
    },
    async updateInventoryLot(lot) {
      // No-op for tests
    }
  };
};

const createSyncEngineMock = (): SyncEngine => ({
  enqueue: vi.fn(async () => ok<void>(undefined)),
  processNext: vi.fn(async () => ok<"processed" | "skipped">("skipped")),
  startPeriodicSync: vi.fn(),
  stopPeriodicSync: vi.fn(),
  getStatus: vi.fn(() => "idle" as const)
});

const ownerActor = {
  role: "owner" as const,
  userId: "u-1",
  permissions: {
    canApplyDiscount: true,
    maxDiscountPercent: 20,
    canApplyCustomPrice: true,
    canVoidSale: true,
    canRefundSale: true,
    canVoidInvoice: true,
    canAdjustStock: true
  }
};

describe("inventory.service", () => {
  it("crea warehouse en orden offline: enqueue antes de commit", async () => {
    const trace: string[] = [];
    const baseDb = createInventoryDbMock();
    const db: InventoryDb = {
      ...baseDb,
      async createWarehouse(warehouse) {
        trace.push("db.commit");
        return baseDb.createWarehouse(warehouse);
      }
    };
    const syncEngine = createSyncEngineMock();
    syncEngine.enqueue = vi.fn(async () => {
      trace.push("sync.enqueue");
      return ok<void>(undefined);
    });

    const service = createInventoryService({
      db,
      syncEngine,
      eventBus: new InMemoryEventBus(),
      clock: () => new Date("2026-01-01T00:00:00.000Z"),
      uuid: () => crypto.randomUUID()
    });

    const result = await service.createWarehouse(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      { name: "Principal", code: "P01" }
    );

    expect(result.ok).toBe(true);
    expect(trace).toEqual(["sync.enqueue", "db.commit"]);
  });

  it("prohibe stock negativo", async () => {
    const service = createInventoryService({
      db: createInventoryDbMock(),
      syncEngine: createSyncEngineMock(),
      eventBus: new InMemoryEventBus()
    });

    const result = await service.recordStockMovement(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      {
        productLocalId: "prod-1",
        warehouseLocalId: "wh-1",
        movementType: "sale_out",
        quantity: 1
      }
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NEGATIVE_STOCK_FORBIDDEN");
    }
  });

  it("bloquea ajustes sin permiso", async () => {
    const service = createInventoryService({
      db: createInventoryDbMock(),
      syncEngine: createSyncEngineMock(),
      eventBus: new InMemoryEventBus()
    });

    const result = await service.recordStockMovement(
      { tenantSlug: "tenant-demo" },
      {
        role: "employee",
        userId: "u-2",
        permissions: {
          canApplyDiscount: false,
          maxDiscountPercent: 0,
          canApplyCustomPrice: false,
          canVoidSale: false,
          canRefundSale: false,
          canVoidInvoice: false,
          canAdjustStock: false,
          allowedWarehouseLocalIds: ["wh-1"]
        }
      },
      {
        productLocalId: "prod-1",
        warehouseLocalId: "wh-1",
        movementType: "adjustment_in",
        quantity: 1
      }
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("ADMIN_PERMISSION_DENIED");
    }
  });

  it("crea y postea conteo de inventario", async () => {
    const db = createInventoryDbMock();
    const service = createInventoryService({
      db,
      syncEngine: createSyncEngineMock(),
      eventBus: new InMemoryEventBus(),
      clock: () => new Date("2026-01-01T00:00:00.000Z"),
      uuid: () => crypto.randomUUID()
    });

    const draft = await service.createInventoryCount(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      {
        productLocalId: "prod-1",
        warehouseLocalId: "wh-1",
        countedQty: 2
      }
    );
    expect(draft.ok).toBe(true);
    if (!draft.ok) {
      return;
    }

    const posted = await service.postInventoryCount(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      draft.data.localId
    );
    expect(posted.ok).toBe(true);
    if (posted.ok) {
      expect(posted.data.status).toBe("posted");
      expect(posted.data.differenceQty).toBe(2);
    }
  });

  it("genera sugerencia de reorden cuando stock cae por debajo del minimo", async () => {
    const db = createInventoryDbMock();
    const service = createInventoryService({
      db,
      syncEngine: createSyncEngineMock(),
      eventBus: new InMemoryEventBus(),
      clock: () => new Date("2026-01-01T00:00:00.000Z"),
      uuid: () => crypto.randomUUID()
    });

    await service.recordStockMovement(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      {
        productLocalId: "prod-1",
        warehouseLocalId: "wh-1",
        movementType: "purchase_in",
        quantity: 3
      }
    );

    const suggestions = await service.getReorderSuggestions(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      { minStock: 5, targetStock: 10 }
    );

    expect(suggestions.ok).toBe(true);
    if (suggestions.ok) {
      expect(suggestions.data.length).toBe(1);
      expect(suggestions.data[0]?.suggestedOrderQty).toBe(7);
    }
  });

  describe("Productos Pesables - Precisión de 4 decimales", () => {
    it("debe mantener precisión de 4 decimales en productos pesables", async () => {
      const db = createInventoryDbMock();
      const service = createInventoryService({
        db,
        syncEngine: createSyncEngineMock(),
        eventBus: new InMemoryEventBus(),
        clock: () => new Date("2026-01-01T00:00:00.000Z"),
        uuid: () => crypto.randomUUID()
      });

      await db.createWarehouse({
        localId: "wh-1",
        tenantId: "tenant-demo",
        name: "Bodega Principal",
        isActive: true,
        isDefault: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z"
      });

      const result = await service.recordStockMovement(
        { tenantSlug: "tenant-demo" },
        ownerActor,
        {
          productLocalId: "prod-pesable-1",
          warehouseLocalId: "wh-1",
          movementType: "purchase_in",
          quantity: 0.1234,
          isWeightedProduct: true
        }
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.quantity).toBe(0.1234);
      }

      const balance = await db.getStockBalance("tenant-demo", "prod-pesable-1", "wh-1");
      expect(balance).toBeCloseTo(0.1234, 4);
    });

    it("NO debe truncar a 2 decimales (error común)", async () => {
      const db = createInventoryDbMock();
      const service = createInventoryService({
        db,
        syncEngine: createSyncEngineMock(),
        eventBus: new InMemoryEventBus(),
        clock: () => new Date("2026-01-01T00:00:00.000Z"),
        uuid: () => crypto.randomUUID()
      });

      await db.createWarehouse({
        localId: "wh-1",
        tenantId: "tenant-demo",
        name: "Bodega Principal",
        isActive: true,
        isDefault: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z"
      });

      const result = await service.recordStockMovement(
        { tenantSlug: "tenant-demo" },
        ownerActor,
        {
          productLocalId: "prod-pesable-2",
          warehouseLocalId: "wh-1",
          movementType: "purchase_in",
          quantity: 0.12345,
          isWeightedProduct: true
        }
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        const storedQty = result.data.quantity;
        expect(storedQty).not.toBe(0.12);
        expect(storedQty).toBeCloseTo(0.1235, 4);
      }
    });

    it("debe rechazar cantidad 0 para productos pesables", async () => {
      const db = createInventoryDbMock();
      const service = createInventoryService({
        db,
        syncEngine: createSyncEngineMock(),
        eventBus: new InMemoryEventBus(),
        clock: () => new Date("2026-01-01T00:00:00.000Z"),
        uuid: () => crypto.randomUUID()
      });

      await db.createWarehouse({
        localId: "wh-1",
        tenantId: "tenant-demo",
        name: "Bodega Principal",
        isActive: true,
        isDefault: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z"
      });

      const result = await service.recordStockMovement(
        { tenantSlug: "tenant-demo" },
        ownerActor,
        {
          productLocalId: "prod-pesable-3",
          warehouseLocalId: "wh-1",
          movementType: "purchase_in",
          quantity: 0,
          isWeightedProduct: true
        }
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("STOCK_MOVEMENT_QUANTITY_INVALID");
      }
    });
  });

  describe("Productos Pesables - Casos Edge", () => {
    it("debe aceptar exactamente 4 decimales", async () => {
      const db = createInventoryDbMock();
      const service = createInventoryService({
        db,
        syncEngine: createSyncEngineMock(),
        eventBus: new InMemoryEventBus(),
        clock: () => new Date("2026-01-01T00:00:00.000Z"),
        uuid: () => crypto.randomUUID()
      });

      await db.createWarehouse({
        localId: "wh-1",
        tenantId: "tenant-demo",
        name: "Bodega Principal",
        isActive: true,
        isDefault: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z"
      });

      const result = await service.recordStockMovement(
        { tenantSlug: "tenant-demo" },
        ownerActor,
        {
          productLocalId: "prod-pesable-4",
          warehouseLocalId: "wh-1",
          movementType: "purchase_in",
          quantity: 0.0001,
          isWeightedProduct: true
        }
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.quantity).toBe(0.0001);
      }
    });

    it("debe rechazar valores menores a 0.0001 (4 decimales minimo)", async () => {
      const db = createInventoryDbMock();
      const service = createInventoryService({
        db,
        syncEngine: createSyncEngineMock(),
        eventBus: new InMemoryEventBus(),
        clock: () => new Date("2026-01-01T00:00:00.000Z"),
        uuid: () => crypto.randomUUID()
      });

      await db.createWarehouse({
        localId: "wh-1",
        tenantId: "tenant-demo",
        name: "Bodega Principal",
        isActive: true,
        isDefault: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z"
      });

      const result = await service.recordStockMovement(
        { tenantSlug: "tenant-demo" },
        ownerActor,
        {
          productLocalId: "prod-pesable-5",
          warehouseLocalId: "wh-1",
          movementType: "purchase_in",
          quantity: 0.00001,
          isWeightedProduct: true
        }
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("WEIGHTED_MOVEMENT_QUANTITY_INVALID");
      }
    });
  });
});
