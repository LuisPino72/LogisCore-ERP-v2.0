import { describe, expect, it, vi } from "vitest";
import { InMemoryEventBus, ok, type SyncEngine } from "@logiscore/core";
import { createSalesService, type SalesDb, type SalesSupabaseLike } from "../services/sales.service";
import type { BoxClosing, Sale, SuspendedSale } from "../types/sales.types";

const createSalesDbMock = (): SalesDb => {
  const sales = new Map<string, Sale>();
  const suspended = new Map<string, SuspendedSale>();
  const closings = new Map<string, BoxClosing>();
  return {
    async createSale(item) {
      sales.set(item.localId, item);
    },
    async listSales(tenantId) {
      return [...sales.values()].filter((item) => item.tenantId === tenantId);
    },
    async createSuspendedSale(item) {
      suspended.set(item.localId, item);
    },
    async listSuspendedSales(tenantId) {
      return [...suspended.values()].filter((item) => item.tenantId === tenantId);
    },
    async markSuspendedSaleConverted(tenantId, localId, updatedAt) {
      const item = suspended.get(localId);
      if (!item || item.tenantId !== tenantId) {
        return;
      }
      suspended.set(localId, { ...item, status: "converted", updatedAt });
    },
    async getSuspendedSaleByLocalId(tenantId, localId) {
      const item = suspended.get(localId);
      if (!item || item.tenantId !== tenantId) {
        return undefined;
      }
      return item;
    },
    async createBoxClosing(item) {
      closings.set(item.localId, item);
    },
    async getOpenBoxByWarehouse(tenantId, warehouseLocalId) {
      const items = [...closings.values()].filter(
        (item) =>
          item.tenantId === tenantId &&
          item.warehouseLocalId === warehouseLocalId &&
          item.status === "open" &&
          !item.deletedAt
      );
      return items.at(-1);
    },
    async closeOpenBoxByWarehouse(tenantId, warehouseLocalId, closeData) {
      const items = [...closings.values()].filter(
        (item) =>
          item.tenantId === tenantId &&
          item.warehouseLocalId === warehouseLocalId &&
          item.status === "open" &&
          !item.deletedAt
      );
      const openBox = items.at(-1);
      if (!openBox) {
        return;
      }
      closings.set(openBox.localId, { ...openBox, ...closeData });
    },
    async listBoxClosings(tenantId) {
      return [...closings.values()].filter((item) => item.tenantId === tenantId);
    },
    async createStockMovements() {
      return;
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

const createSupabaseMock = (): SalesSupabaseLike =>
  ({
    rpc: vi.fn(async <T,>(fn: string): Promise<{ data: T | null; error: { message: string } | null }> => {
      if (fn === "create_suspended_sale") {
        return { data: [{ success: true, code: "SUSPENDED_SALE_SAVED", message: "ok" }] as unknown as T | null, error: null };
      }
      if (fn === "create_pos_sale") {
        return { data: [{ success: true, code: "SALE_CREATED", message: "ok" }] as unknown as T | null, error: null };
      }
      if (fn === "close_box_closing" || fn === "close_open_box_closing") {
        return { data: [{ success: true, code: "BOX_CLOSING_CREATED", message: "ok", expected_amount: 100, difference_amount: 5, opening_amount: 10, sales_count: 2 }] as unknown as T | null, error: null };
      }
      if (fn === "open_box_closing") {
        return { data: [{ success: true, code: "BOX_OPENED", message: "ok" }] as unknown as T | null, error: null };
      }
      return { data: null, error: { message: "rpc_not_found" } };
    })
  }) as SalesSupabaseLike;

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
    canAdjustStock: true,
    allowedWarehouseLocalIds: []
  }
};

describe("sales.service", () => {
  it("crea venta suspendida", async () => {
    const service = createSalesService({
      db: createSalesDbMock(),
      syncEngine: createSyncEngineMock(),
      eventBus: new InMemoryEventBus(),
      supabase: createSupabaseMock()
    });

    const result = await service.createSuspendedSale(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      {
        warehouseLocalId: "wh-1",
        cart: [{ productLocalId: "prod-1", qty: 1, unitPrice: 10 }]
      }
    );

    expect(result.ok).toBe(true);
  });

  it("finaliza venta POS", async () => {
    const service = createSalesService({
      db: createSalesDbMock(),
      syncEngine: createSyncEngineMock(),
      eventBus: new InMemoryEventBus(),
      supabase: createSupabaseMock()
    });

    const result = await service.createPosSale(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      {
        warehouseLocalId: "wh-1",
        currency: "VES",
        exchangeRate: 1,
        subtotal: 10,
        taxTotal: 0,
        discountTotal: 0,
        total: 10,
        totalPaid: 10,
        changeAmount: 0,
        items: [{ productLocalId: "prod-1", qty: 1, unitPrice: 10 }],
        payments: [{ method: "cash", currency: "VES", amount: 10 }]
      }
    );

    expect(result.ok).toBe(true);
  });

  it("acepta pagos mixtos VES/USD y calcula cambio", async () => {
    const service = createSalesService({
      db: createSalesDbMock(),
      syncEngine: createSyncEngineMock(),
      eventBus: new InMemoryEventBus(),
      supabase: createSupabaseMock()
    });

    const result = await service.createPosSale(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      {
        warehouseLocalId: "wh-1",
        currency: "VES",
        exchangeRate: 40,
        subtotal: 100,
        taxTotal: 0,
        discountTotal: 0,
        total: 100,
        items: [{ productLocalId: "prod-1", qty: 1, unitPrice: 100 }],
        payments: [
          { method: "cash", currency: "VES", amount: 40 },
          { method: "card", currency: "USD", amount: 2 }
        ]
      }
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.data.totalPaid).toBe(120);
    expect(result.data.changeAmount).toBe(20);
  });

  it("rechaza pago insuficiente", async () => {
    const service = createSalesService({
      db: createSalesDbMock(),
      syncEngine: createSyncEngineMock(),
      eventBus: new InMemoryEventBus(),
      supabase: createSupabaseMock()
    });

    const result = await service.createPosSale(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      {
        warehouseLocalId: "wh-1",
        currency: "VES",
        exchangeRate: 40,
        subtotal: 100,
        taxTotal: 0,
        discountTotal: 0,
        total: 100,
        items: [{ productLocalId: "prod-1", qty: 1, unitPrice: 100 }],
        payments: [{ method: "cash", currency: "VES", amount: 90 }]
      }
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("PAYMENT_INSUFFICIENT");
    }
  });

  it("cierra caja solo owner/admin", async () => {
    const db = createSalesDbMock();
    const service = createSalesService({
      db,
      syncEngine: createSyncEngineMock(),
      eventBus: new InMemoryEventBus(),
      supabase: createSupabaseMock()
    });
    await service.openBox(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      {
        warehouseLocalId: "wh-1",
        openingAmount: 10
      }
    );

    const denied = await service.closeBox(
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
        warehouseLocalId: "wh-1",
        countedAmount: 10
      }
    );

    expect(denied.ok).toBe(false);
    if (!denied.ok) {
      expect(denied.error.code).toBe("BOX_CLOSING_PERMISSION_DENIED");
    }
  });

  it("abre y cierra caja con sesion activa", async () => {
    const service = createSalesService({
      db: createSalesDbMock(),
      syncEngine: createSyncEngineMock(),
      eventBus: new InMemoryEventBus(),
      supabase: createSupabaseMock()
    });

    const opened = await service.openBox(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      {
        warehouseLocalId: "wh-1",
        openingAmount: 10
      }
    );
    expect(opened.ok).toBe(true);

    const closed = await service.closeBox(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      {
        warehouseLocalId: "wh-1",
        countedAmount: 105
      }
    );
    expect(closed.ok).toBe(true);
    if (!closed.ok) {
      return;
    }
    expect(closed.data.status).toBe("closed");
    expect(closed.data.openingAmount).toBe(10);
  });

  it("restaura venta suspendida abierta", async () => {
    const db = createSalesDbMock();
    const service = createSalesService({
      db,
      syncEngine: createSyncEngineMock(),
      eventBus: new InMemoryEventBus(),
      supabase: createSupabaseMock()
    });

    const suspendedResult = await service.createSuspendedSale(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      {
        warehouseLocalId: "wh-1",
        cart: [{ productLocalId: "prod-1", qty: 2, unitPrice: 5 }]
      }
    );
    expect(suspendedResult.ok).toBe(true);
    if (!suspendedResult.ok) {
      return;
    }

    const restored = await service.restoreSuspendedSale(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      suspendedResult.data.localId
    );

    expect(restored.ok).toBe(true);
    if (!restored.ok) {
      return;
    }
    expect(restored.data.sourceLocalId).toBe(suspendedResult.data.localId);
    expect(restored.data.cart).toHaveLength(1);
  });

  it("rechaza restore de venta suspendida convertida", async () => {
    const db = createSalesDbMock();
    const service = createSalesService({
      db,
      syncEngine: createSyncEngineMock(),
      eventBus: new InMemoryEventBus(),
      supabase: createSupabaseMock()
    });

    await db.createSuspendedSale({
      localId: "ss-converted",
      tenantId: "tenant-demo",
      warehouseLocalId: "wh-1",
      cashierUserId: "u-1",
      status: "converted",
      cart: [{ productLocalId: "prod-1", qty: 1, unitPrice: 10 }],
      paymentsDraft: [],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    });

    const restored = await service.restoreSuspendedSale(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      "ss-converted"
    );

    expect(restored.ok).toBe(false);
    if (restored.ok) {
      return;
    }
    expect(restored.error.code).toBe("SUSPENDED_SALE_NOT_RESTORABLE");
  });

  it("rechaza restore de venta suspendida no existente", async () => {
    const service = createSalesService({
      db: createSalesDbMock(),
      syncEngine: createSyncEngineMock(),
      eventBus: new InMemoryEventBus(),
      supabase: createSupabaseMock()
    });

    const restored = await service.restoreSuspendedSale(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      "ss-nonexistent"
    );

    expect(restored.ok).toBe(false);
    if (restored.ok) {
      return;
    }
    expect(restored.error.code).toBe("SUSPENDED_SALE_NOT_FOUND");
  });

  it("soporta multiple apertura-cierre de caja en misma bodega", async () => {
    const db = createSalesDbMock();
    const service = createSalesService({
      db,
      syncEngine: createSyncEngineMock(),
      eventBus: new InMemoryEventBus(),
      supabase: createSupabaseMock()
    });

    const open1 = await service.openBox(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      { warehouseLocalId: "wh-1", openingAmount: 10 }
    );
    expect(open1.ok).toBe(true);

    const close1 = await service.closeBox(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      { warehouseLocalId: "wh-1", countedAmount: 15 }
    );
    expect(close1.ok).toBe(true);
    if (!close1.ok) return;
    expect(close1.data.status).toBe("closed");

    const open2 = await service.openBox(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      { warehouseLocalId: "wh-1", openingAmount: 20 }
    );
    expect(open2.ok).toBe(true);
    if (!open2.ok) return;
    expect(open2.data.status).toBe("open");
    expect(open2.data.openingAmount).toBe(20);

    const close2 = await service.closeBox(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      { warehouseLocalId: "wh-1", countedAmount: 25 }
    );
    expect(close2.ok).toBe(true);
    if (!close2.ok) return;
    expect(close2.data.status).toBe("closed");
  });

  it("rechaza apertura de caja cuando ya hay una abierta", async () => {
    const service = createSalesService({
      db: createSalesDbMock(),
      syncEngine: createSyncEngineMock(),
      eventBus: new InMemoryEventBus(),
      supabase: createSupabaseMock()
    });

    await service.openBox(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      { warehouseLocalId: "wh-1", openingAmount: 10 }
    );

    const secondOpen = await service.openBox(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      { warehouseLocalId: "wh-1", openingAmount: 20 }
    );

    expect(secondOpen.ok).toBe(false);
    if (secondOpen.ok) return;
    expect(secondOpen.error.code).toBe("BOX_ALREADY_OPEN");
  });

  it("valida permiso de descuento para empleados", async () => {
    const service = createSalesService({
      db: createSalesDbMock(),
      syncEngine: createSyncEngineMock(),
      eventBus: new InMemoryEventBus(),
      supabase: createSupabaseMock()
    });

    const result = await service.createPosSale(
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
        warehouseLocalId: "wh-1",
        currency: "VES",
        exchangeRate: 1,
        subtotal: 100,
        taxTotal: 0,
        discountTotal: 10,
        total: 90,
        items: [{ productLocalId: "prod-1", qty: 1, unitPrice: 100 }],
        payments: [{ method: "cash", currency: "VES", amount: 100 }]
      }
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("DISCOUNT_PERMISSION_DENIED");
  });

  it("valida limite de descuento del empleado", async () => {
    const service = createSalesService({
      db: createSalesDbMock(),
      syncEngine: createSyncEngineMock(),
      eventBus: new InMemoryEventBus(),
      supabase: createSupabaseMock()
    });

    const result = await service.createPosSale(
      { tenantSlug: "tenant-demo" },
      {
        role: "employee",
        userId: "u-2",
        permissions: {
          canApplyDiscount: true,
          maxDiscountPercent: 10,
          canApplyCustomPrice: false,
          canVoidSale: false,
          canRefundSale: false,
          canVoidInvoice: false,
          canAdjustStock: false,
          allowedWarehouseLocalIds: ["wh-1"]
        }
      },
      {
        warehouseLocalId: "wh-1",
        currency: "VES",
        exchangeRate: 1,
        subtotal: 100,
        taxTotal: 0,
        discountTotal: 20,
        total: 80,
        items: [{ productLocalId: "prod-1", qty: 1, unitPrice: 100 }],
        payments: [{ method: "cash", currency: "VES", amount: 100 }]
      }
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("DISCOUNT_LIMIT_EXCEEDED");
  });

  it("flujo completo POS: abrir caja, venta, cerrar caja", async () => {
    const db = createSalesDbMock();
    const service = createSalesService({
      db,
      syncEngine: createSyncEngineMock(),
      eventBus: new InMemoryEventBus(),
      supabase: createSupabaseMock()
    });

    const opened = await service.openBox(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      { warehouseLocalId: "wh-1", openingAmount: 50 }
    );
    expect(opened.ok).toBe(true);

    const sale = await service.createPosSale(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      {
        warehouseLocalId: "wh-1",
        currency: "VES",
        exchangeRate: 1,
        subtotal: 30,
        taxTotal: 0,
        discountTotal: 0,
        total: 30,
        totalPaid: 50,
        changeAmount: 20,
        items: [
          { productLocalId: "prod-1", qty: 2, unitPrice: 10 },
          { productLocalId: "prod-2", qty: 1, unitPrice: 10 }
        ],
        payments: [{ method: "cash", currency: "VES", amount: 50 }]
      }
    );
    expect(sale.ok).toBe(true);

    const closed = await service.closeBox(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      { warehouseLocalId: "wh-1", countedAmount: 80 }
    );
    expect(closed.ok).toBe(true);
    if (!closed.ok) return;
    expect(closed.data.status).toBe("closed");
  });

  it("calcula cambio correctamente en pago en efectivo", async () => {
    const service = createSalesService({
      db: createSalesDbMock(),
      syncEngine: createSyncEngineMock(),
      eventBus: new InMemoryEventBus(),
      supabase: createSupabaseMock()
    });

    await service.openBox(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      { warehouseLocalId: "wh-1", openingAmount: 10 }
    );

    const result = await service.createPosSale(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      {
        warehouseLocalId: "wh-1",
        currency: "VES",
        exchangeRate: 1,
        subtotal: 75,
        taxTotal: 0,
        discountTotal: 0,
        total: 75,
        totalPaid: 100,
        changeAmount: 25,
        items: [{ productLocalId: "prod-1", qty: 1, unitPrice: 75 }],
        payments: [{ method: "cash", currency: "VES", amount: 100 }]
      }
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.totalPaid).toBe(100);
    expect(result.data.changeAmount).toBe(25);
  });

  it("maneja pagos con tarjeta correctamente", async () => {
    const service = createSalesService({
      db: createSalesDbMock(),
      syncEngine: createSyncEngineMock(),
      eventBus: new InMemoryEventBus(),
      supabase: createSupabaseMock()
    });

    await service.openBox(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      { warehouseLocalId: "wh-1", openingAmount: 10 }
    );

    const result = await service.createPosSale(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      {
        warehouseLocalId: "wh-1",
        currency: "VES",
        exchangeRate: 1,
        subtotal: 200,
        taxTotal: 0,
        discountTotal: 0,
        total: 200,
        totalPaid: 200,
        changeAmount: 0,
        items: [
          { productLocalId: "prod-1", qty: 1, unitPrice: 100 },
          { productLocalId: "prod-2", qty: 1, unitPrice: 100 }
        ],
        payments: [{ method: "card", currency: "VES", amount: 200 }]
      }
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.payments[0].method).toBe("card");
  });
});
