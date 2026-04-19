import { describe, expect, it, vi } from "vitest";
import { InMemoryEventBus, ok, type SyncEngine } from "@logiscore/core";
import type { StockMovementRecord } from "@/lib/db/dexie";
import {
  createPurchasesService,
  type PurchasesDb,
  type PurchasesService
} from "../services/purchases.service";
import type { EditPurchaseInput, InventoryLot, Purchase, Receiving, Supplier } from "../types/purchases.types";

const createSyncEngineMock = (): SyncEngine => ({
  enqueue: vi.fn(async () => ok<void>(undefined)),
  processNext: vi.fn(async () => ok<"processed" | "skipped">("skipped")),
  startPeriodicSync: vi.fn(),
  stopPeriodicSync: vi.fn(),
  getStatus: vi.fn(() => "idle" as const)
});

const createDbMock = (): PurchasesDb => {
  const suppliers = new Map<string, Supplier>();
  const purchases = new Map<string, Purchase>();
  const receivings = new Map<string, Receiving>();
  const inventoryLots = new Map<string, InventoryLot>();
  const products = new Map<string, { localId: string; tenantId: string; preferredSupplierLocalId?: string | null }>();

  return {
    async createSupplier(supplier) {
      suppliers.set(supplier.localId, supplier);
    },
    async updateSupplier(supplier) {
      suppliers.set(supplier.localId, supplier);
    },
    async listSuppliers(tenantId) {
      return [...suppliers.values()].filter((item) => item.tenantId === tenantId);
    },
    async getSupplierByLocalId(tenantId, localId) {
      const supplier = suppliers.get(localId);
      if (!supplier || supplier.tenantId !== tenantId) {
        return undefined;
      }
      return supplier;
    },
    async createPurchase(purchase) {
      purchases.set(purchase.localId, purchase);
    },
    async updatePurchase(purchase) {
      const existing = purchases.get(purchase.localId);
      if (existing) {
        purchases.set(purchase.localId, { ...existing, ...purchase });
      }
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
    },
    async updateProductPreferredSupplier(tenantId, productLocalId, supplierLocalId) {
      const product = products.get(productLocalId);
      if (!product || product.tenantId !== tenantId) return;
      products.set(productLocalId, { ...product, preferredSupplierLocalId: supplierLocalId });
    },
    async softDeleteSupplier(localId, tenantId, deletedAt) {
      const supplier = suppliers.get(localId);
      if (!supplier || supplier.tenantId !== tenantId) return;
      suppliers.set(localId, { ...supplier, deletedAt });
    },
    async getProductByLocalId(tenantId, localId) {
      const product = products.get(localId);
      if (!product || product.tenantId !== tenantId) return undefined;
      return product;
    },
    async createAuditLog() {
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
  it("crea un proveedor", async () => {
    const eventBus = new InMemoryEventBus();
    const spy = vi.fn();
    eventBus.on("SUPPLIER.CREATED", spy);
    const service = createPurchasesService({
      eventBus,
      db: createDbMock(),
      syncEngine: createSyncEngineMock()
    });

    const result = await service.createSupplier(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      { name: "Proveedor Test", rif: "J123456789", phone: "04141234567" }
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.name).toBe("Proveedor Test");
    expect(result.data.isActive).toBe(true);
    expect(spy).toHaveBeenCalled();
  });

  it("lista proveedores", async () => {
    const service = createService();
    await service.createSupplier(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      { name: "Proveedor A" }
    );
    await service.createSupplier(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      { name: "Proveedor B" }
    );

    const result = await service.listSuppliers({ tenantSlug: "tenant-demo" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toHaveLength(2);
  });

  it("actualiza un proveedor", async () => {
    const service = createService();
    const created = await service.createSupplier(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      { name: "Proveedor Original" }
    );
    if (!created.ok) return;

    const updated = await service.updateSupplier(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      { localId: created.data.localId, name: "Proveedor Modificado" }
    );

    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    expect(updated.data.name).toBe("Proveedor Modificado");
  });

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
    if (!result.ok) return;
    expect(result.data.status).toBe("draft");
    expect(result.data.total).toBe(20);
    expect(result.data.currency).toBe("USD");
    expect(result.data.exchangeRate).toBe(1);
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
    if (!created.ok) return;

    const confirmed = await service.confirmPurchase(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      created.data.localId
    );
    expect(confirmed.ok).toBe(true);

    const received = await service.receivePurchase(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      {
        purchaseLocalId: created.data.localId,
        receivedItems: [{ productLocalId: "prod-1", qty: 1 }]
      }
    );

    expect(received.ok).toBe(true);
    if (!received.ok) return;
    expect(received.data.status).toBe("posted");
    expect(received.data.totalCost).toBe(12);

    const lots = await service.listInventoryLots({ tenantSlug: "tenant-demo" });
    expect(lots.ok).toBe(true);
    if (!lots.ok) return;
    expect(lots.data).toHaveLength(1);
  });

  it("recibe una compra parcialmente", async () => {
    const service = createService();
    const created = await service.createPurchase(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      {
        warehouseLocalId: "wh-1",
        items: [
          { productLocalId: "prod-1", qty: 10, unitCost: 5 },
          { productLocalId: "prod-2", qty: 5, unitCost: 10 }
        ]
      }
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const confirmed = await service.confirmPurchase(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      created.data.localId
    );
    expect(confirmed.ok).toBe(true);

    const received = await service.receivePurchase(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      {
        purchaseLocalId: created.data.localId,
        receivedItems: [
          { productLocalId: "prod-1", qty: 5 },
          { productLocalId: "prod-2", qty: 5 }
        ]
      }
    );

    expect(received.ok).toBe(true);
    if (!received.ok) return;
    expect(received.data.status).toBe("posted");

    const purchases = await service.listPurchases({ tenantSlug: "tenant-demo" });
    expect(purchases.ok).toBe(true);
    if (!purchases.ok) return;
    const purchase = purchases.data[0];
    expect(purchase?.status).toBe("partial_received");
  });

  it("rechaza recepcion de compra anulada", async () => {
    const db = createDbMock();
    await db.createPurchase({
      localId: "pur-cancelled",
      tenantId: "tenant-demo",
      warehouseLocalId: "wh-1",
      status: "cancelled",
      currency: "USD",
      exchangeRate: 1,
      subtotal: 10,
      total: 10,
      items: [{ productLocalId: "prod-1", qty: 1, unitCost: 10 }],
      receivedItems: [],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    });
    const service = createService(db);

    const received = await service.receivePurchase(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      {
        purchaseLocalId: "pur-cancelled",
        receivedItems: [{ productLocalId: "prod-1", qty: 1 }]
      }
    );

    expect(received.ok).toBe(false);
    if (received.ok) return;
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
    if (!created.ok) return;

    const confirmed = await service.confirmPurchase(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      created.data.localId
    );
    expect(confirmed.ok).toBe(true);

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
      {
        purchaseLocalId: created.data.localId,
        receivedItems: [{ productLocalId: "prod-1", qty: 1 }]
      }
    );

    expect(received.ok).toBe(false);
    if (received.ok) return;
    expect(received.error.code).toBe("ADMIN_INSUFFICIENT_WAREHOUSE_ACCESS");
  });

  it("confirma una compra en estado draft", async () => {
    const eventBus = new InMemoryEventBus();
    const spy = vi.fn();
    eventBus.on("PURCHASES.CONFIRMED", spy);
    const service = createPurchasesService({
      eventBus,
      db: createDbMock(),
      syncEngine: createSyncEngineMock()
    });

    const created = await service.createPurchase(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      { warehouseLocalId: "wh-1", items: [{ productLocalId: "prod-1", qty: 2, unitCost: 10 }] }
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const confirmed = await service.confirmPurchase(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      created.data.localId
    );

    expect(confirmed.ok).toBe(true);
    if (!confirmed.ok) return;
    expect(confirmed.data.status).toBe("confirmed");
    expect(spy).toHaveBeenCalled();
  });

  it("rechaza confirmar compra que no está en draft", async () => {
    const db = createDbMock();
    await db.createPurchase({
      localId: "pur-confirmed",
      tenantId: "tenant-demo",
      warehouseLocalId: "wh-1",
      status: "confirmed",
      currency: "USD",
      exchangeRate: 1,
      subtotal: 20,
      total: 20,
      items: [{ productLocalId: "prod-1", qty: 2, unitCost: 10 }],
      receivedItems: [],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    });
    const service = createService(db);

    const confirmed = await service.confirmPurchase(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      "pur-confirmed"
    );

    expect(confirmed.ok).toBe(false);
    if (confirmed.ok) return;
    expect(confirmed.error.code).toBe("PURCHASE_NOT_DRAFT");
  });

  it("cancela una compra en estado draft", async () => {
    const eventBus = new InMemoryEventBus();
    const spy = vi.fn();
    eventBus.on("PURCHASES.CANCELLED", spy);
    const service = createPurchasesService({
      eventBus,
      db: createDbMock(),
      syncEngine: createSyncEngineMock()
    });

    const created = await service.createPurchase(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      { warehouseLocalId: "wh-1", items: [{ productLocalId: "prod-1", qty: 1, unitCost: 15 }] }
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const cancelled = await service.cancelPurchase(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      created.data.localId
    );

    expect(cancelled.ok).toBe(true);
    if (!cancelled.ok) return;
    expect(cancelled.data.status).toBe("cancelled");
    expect(spy).toHaveBeenCalled();
  });

  it("rechaza cancelar una compra ya recibida", async () => {
    const db = createDbMock();
    await db.createPurchase({
      localId: "pur-received",
      tenantId: "tenant-demo",
      warehouseLocalId: "wh-1",
      status: "received",
      currency: "USD",
      exchangeRate: 1,
      subtotal: 10,
      total: 10,
      items: [{ productLocalId: "prod-1", qty: 1, unitCost: 10 }],
      receivedItems: [],
      receivedAt: "2026-01-01T00:00:00.000Z",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    });
    const service = createService(db);

    const cancelled = await service.cancelPurchase(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      "pur-received"
    );

    expect(cancelled.ok).toBe(false);
    if (cancelled.ok) return;
    expect(cancelled.error.code).toBe("PURCHASE_RECEIVED_NOT_CANCELLABLE");
  });

  it("rechaza cancelar una compra ya cancelada", async () => {
    const db = createDbMock();
    await db.createPurchase({
      localId: "pur-cancelled2",
      tenantId: "tenant-demo",
      warehouseLocalId: "wh-1",
      status: "cancelled",
      currency: "USD",
      exchangeRate: 1,
      subtotal: 10,
      total: 10,
      items: [{ productLocalId: "prod-1", qty: 1, unitCost: 10 }],
      receivedItems: [],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    });
    const service = createService(db);

    const cancelled = await service.cancelPurchase(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      "pur-cancelled2"
    );

    expect(cancelled.ok).toBe(false);
    if (cancelled.ok) return;
    expect(cancelled.error.code).toBe("PURCHASE_ALREADY_CANCELLED");
  });

  it("edita una compra en estado draft", async () => {
    const eventBus = new InMemoryEventBus();
    const spy = vi.fn();
    eventBus.on("PURCHASES.UPDATED", spy);
    const service = createPurchasesService({
      eventBus,
      db: createDbMock(),
      syncEngine: createSyncEngineMock()
    });

    const created = await service.createPurchase(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      { warehouseLocalId: "wh-1", items: [{ productLocalId: "prod-1", qty: 1, unitCost: 10 }] }
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const editInput: EditPurchaseInput = {
      purchaseLocalId: created.data.localId,
      items: [
        { productLocalId: "prod-1", qty: 5, unitCost: 20 },
        { productLocalId: "prod-2", qty: 3, unitCost: 15 }
      ]
    };

    const edited = await service.editPurchase(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      editInput
    );

    expect(edited.ok).toBe(true);
    if (!edited.ok) return;
    expect(edited.data.items).toHaveLength(2);
    expect(edited.data.total).toBe(145);
    expect(spy).toHaveBeenCalled();
  });

  it("rechaza editar una compra que no está en draft", async () => {
    const db = createDbMock();
    await db.createPurchase({
      localId: "pur-edit-confirmed",
      tenantId: "tenant-demo",
      warehouseLocalId: "wh-1",
      status: "confirmed",
      currency: "USD",
      exchangeRate: 1,
      subtotal: 10,
      total: 10,
      items: [{ productLocalId: "prod-1", qty: 1, unitCost: 10 }],
      receivedItems: [],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    });
    const service = createService(db);

    const edited = await service.editPurchase(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      { purchaseLocalId: "pur-edit-confirmed", items: [{ productLocalId: "prod-1", qty: 2, unitCost: 5 }] }
    );

    expect(edited.ok).toBe(false);
    if (edited.ok) return;
    expect(edited.error.code).toBe("PURCHASE_NOT_DRAFT");
  });

  it("rechaza editar compra sin items", async () => {
    const service = createService();
    const created = await service.createPurchase(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      { warehouseLocalId: "wh-1", items: [{ productLocalId: "prod-1", qty: 1, unitCost: 10 }] }
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const edited = await service.editPurchase(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      { purchaseLocalId: created.data.localId, items: [] }
    );

    expect(edited.ok).toBe(false);
    if (edited.ok) return;
    expect(edited.error.code).toBe("PURCHASE_ITEMS_REQUIRED");
  });

it("recibe parcialmente múltiples productos con cantidades diferentes", async () => {
    const db = createDbMock();
    const service = createService(db);
    const created = await service.createPurchase(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      {
        warehouseLocalId: "wh-1",
        items: [
          { productLocalId: "prod-a", qty: 100, unitCost: 5 },
          { productLocalId: "prod-b", qty: 50, unitCost: 10 },
          { productLocalId: "prod-c", qty: 25, unitCost: 20 }
        ]
      }
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const confirmed = await service.confirmPurchase(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      created.data.localId
    );
    expect(confirmed.ok).toBe(true);

    const received = await service.receivePurchase(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      {
        purchaseLocalId: created.data.localId,
        receivedItems: [
          { productLocalId: "prod-a", qty: 50 },
          { productLocalId: "prod-b", qty: 25 },
          { productLocalId: "prod-c", qty: 25 }
        ]
      }
    );

    expect(received.ok).toBe(true);
    if (!received.ok) return;
    expect(received.data.status).toBe("posted");

    const purchases = await service.listPurchases({ tenantSlug: "tenant-demo" });
    expect(purchases.ok).toBe(true);
    if (!purchases.ok) return;
    const purchase = purchases.data[0];
    expect(purchase?.status).toBe("partial_received");
  });

  it("recibe parcialmente y luego otra recepcion parcial", async () => {
    const service = createService();
    const created = await service.createPurchase(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      {
        warehouseLocalId: "wh-1",
        items: [{ productLocalId: "prod-1", qty: 10, unitCost: 15 }]
      }
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const confirmed = await service.confirmPurchase(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      created.data.localId
    );
    expect(confirmed.ok).toBe(true);

    const firstReceive = await service.receivePurchase(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      {
        purchaseLocalId: created.data.localId,
        receivedItems: [{ productLocalId: "prod-1", qty: 5 }]
      }
    );
    expect(firstReceive.ok).toBe(true);

    const purchases = await service.listPurchases({ tenantSlug: "tenant-demo" });
    expect(purchases.ok).toBe(true);
    if (!purchases.ok) return;
    expect(purchases.data[0]?.status).toBe("partial_received");
  });

  it("recibe parcialmente un solo item de varios", async () => {
    const service = createService();
    const created = await service.createPurchase(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      {
        warehouseLocalId: "wh-1",
        items: [
          { productLocalId: "prod-a", qty: 10, unitCost: 5 },
          { productLocalId: "prod-b", qty: 10, unitCost: 5 }
        ]
      }
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const confirmed = await service.confirmPurchase(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      created.data.localId
    );
    expect(confirmed.ok).toBe(true);

    const received = await service.receivePurchase(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      {
        purchaseLocalId: created.data.localId,
        receivedItems: [{ productLocalId: "prod-a", qty: 10 }]
      }
    );

    expect(received.ok).toBe(true);
    if (!received.ok) return;

    const lots = await service.listInventoryLots({ tenantSlug: "tenant-demo" });
    expect(lots.ok).toBe(true);
    if (!lots.ok) return;
    expect(lots.data).toHaveLength(1);
    expect(lots.data[0]?.productLocalId).toBe("prod-a");
  });

  it("recepciones parciales crean movimientos de inventario", async () => {
    const eventBus = new InMemoryEventBus();
    const movementSpy = vi.fn();
    eventBus.on("INVENTORY.STOCK_MOVEMENT_RECORDED", movementSpy);

    const service = createPurchasesService({
      eventBus,
      db: createDbMock(),
      syncEngine: createSyncEngineMock()
    });

    const created = await service.createPurchase(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      { warehouseLocalId: "wh-1", items: [{ productLocalId: "prod-1", qty: 20, unitCost: 8 }] }
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const confirmed = await service.confirmPurchase(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      created.data.localId
    );
    expect(confirmed.ok).toBe(true);

    await service.receivePurchase(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      { purchaseLocalId: created.data.localId, receivedItems: [{ productLocalId: "prod-1", qty: 10 }] }
    );

    expect(movementSpy).toHaveBeenCalled();
  });
});