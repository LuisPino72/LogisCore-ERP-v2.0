import { describe, expect, it, vi } from "vitest";
import { InMemoryEventBus, ok, type SyncEngine } from "@logiscore/core";
import type { StockMovementRecord } from "@/lib/db/dexie";
import {
  createPurchasesService,
  type PurchasesDb,
  type PurchasesService
} from "../services/purchases.service";
import type { InventoryLot, Purchase, Receiving } from "../types/purchases.types";

const createSyncEngineMock = (): SyncEngine => ({
  enqueue: vi.fn(async () => ok<void>(undefined)),
  processNext: vi.fn(async () => ok<"processed" | "skipped">("skipped")),
  startPeriodicSync: vi.fn(),
  stopPeriodicSync: vi.fn(),
  getStatus: vi.fn(() => "idle" as const)
});

const createDbMock = (): PurchasesDb => {
  const purchases = new Map<string, Purchase>();
  const receivings = new Map<string, Receiving>();
  const inventoryLots = new Map<string, InventoryLot>();

  return {
    async createPurchase(purchase) {
      purchases.set(purchase.localId, purchase);
    },
    async listPurchases(tenantId) {
      return [...purchases.values()].filter((item) => item.tenantId === tenantId);
    },
    async getPurchaseByLocalId(tenantId, localId) {
      const purchase = purchases.get(localId);
      if (!purchase || purchase.tenantId !== tenantId) {
        return undefined;
      }
      return purchase;
    },
    async listReceivings(tenantId) {
      return [...receivings.values()].filter((item) => item.tenantId === tenantId);
    },
    async listInventoryLots(tenantId) {
      return [...inventoryLots.values()].filter((item) => item.tenantId === tenantId);
    },
    async receivePurchase(
      tenantId,
      purchaseLocalId,
      purchasePatch,
      receiving,
      stockMovements: StockMovementRecord[],
      lots: InventoryLot[]
    ) {
      void stockMovements;
      const purchase = purchases.get(purchaseLocalId);
      if (!purchase || purchase.tenantId !== tenantId) {
        return;
      }
      purchases.set(purchaseLocalId, { ...purchase, ...purchasePatch });
      receivings.set(receiving.localId, receiving);
      for (const lot of lots) {
        inventoryLots.set(lot.localId, lot);
      }
    }
  };
};

const ownerActor = {
  role: "owner" as const,
  userId: "u-1",
  permissions: {
    canApplyDiscount: true,
    maxDiscountPercent: 100,
    canApplyCustomPrice: true,
    canVoidSale: true,
    canRefundSale: true,
    canVoidInvoice: true,
    canAdjustStock: true,
    allowedWarehouseLocalIds: []
  }
};

const createService = (db: PurchasesDb = createDbMock()): PurchasesService =>
  createPurchasesService({
    eventBus: new InMemoryEventBus(),
    db,
    syncEngine: createSyncEngineMock()
  });

describe("purchases.service", () => {
  it("emite comando para crear categoria desde compras", async () => {
    const eventBus = new InMemoryEventBus();
    const spy = vi.fn();
    eventBus.on("PURCHASES.CATEGORY_CREATE_REQUESTED", spy);
    const service = createPurchasesService({
      eventBus,
      db: createDbMock(),
      syncEngine: createSyncEngineMock()
    });

    const result = await service.requestCreateCategory({ name: "Bebidas" });
    expect(result.ok).toBe(true);
    expect(spy).toHaveBeenCalledWith({ name: "Bebidas" });
  });

  it("crea una compra en estado draft", async () => {
    const service = createService();
    const result = await service.createPurchase(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      {
        warehouseLocalId: "wh-1",
        supplierName: "Proveedor A",
        items: [{ productLocalId: "prod-1", qty: 2, unitCost: 10 }]
      }
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.data.status).toBe("draft");
    expect(result.data.total).toBe(20);
  });

  it("recibe una compra draft y la marca como received", async () => {
    const service = createService();
    const created = await service.createPurchase(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      {
        warehouseLocalId: "wh-1",
        items: [{ productLocalId: "prod-1", qty: 1, unitCost: 12 }]
      }
    );
    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    const received = await service.receivePurchase(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      { purchaseLocalId: created.data.localId }
    );

    expect(received.ok).toBe(true);
    if (!received.ok) {
      return;
    }
    expect(received.data.status).toBe("posted");
    expect(received.data.totalCost).toBe(12);

    const lots = await service.listInventoryLots({ tenantSlug: "tenant-demo" });
    expect(lots.ok).toBe(true);
    if (!lots.ok) {
      return;
    }
    expect(lots.data).toHaveLength(1);
  });

  it("rechaza recepcion de compra anulada", async () => {
    const db = createDbMock();
    await db.createPurchase({
      localId: "pur-cancelled",
      tenantId: "tenant-demo",
      warehouseLocalId: "wh-1",
      status: "cancelled",
      subtotal: 10,
      total: 10,
      items: [{ productLocalId: "prod-1", qty: 1, unitCost: 10 }],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    });
    const service = createService(db);

    const received = await service.receivePurchase(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      { purchaseLocalId: "pur-cancelled" }
    );

    expect(received.ok).toBe(false);
    if (received.ok) {
      return;
    }
    expect(received.error.code).toBe("PURCHASE_CANCELLED_NOT_RECEIVABLE");
  });

  it("bloquea recepcion para empleado sin acceso a bodega", async () => {
    const service = createService();
    const created = await service.createPurchase(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      {
        warehouseLocalId: "wh-1",
        items: [{ productLocalId: "prod-1", qty: 1, unitCost: 8 }]
      }
    );
    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    const received = await service.receivePurchase(
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
          allowedWarehouseLocalIds: []
        }
      },
      { purchaseLocalId: created.data.localId }
    );

    expect(received.ok).toBe(false);
    if (received.ok) {
      return;
    }
    expect(received.error.code).toBe("WAREHOUSE_ACCESS_DENIED");
  });
});
