import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { err, ok, type AppError } from "@logiscore/core";
import { usePurchases } from "../hooks/usePurchases";
import type { PurchasesService } from "../services/purchases.service";

const createServiceMock = (): PurchasesService => ({
  createSupplier: vi.fn(async () => ok({
    localId: "sup-1",
    tenantId: "tenant-demo",
    name: "Proveedor Test",
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  })),
  updateSupplier: vi.fn(async () => ok({
    localId: "sup-1",
    tenantId: "tenant-demo",
    name: "Proveedor Test",
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  })),
  listSuppliers: vi.fn(async () => ok([])),
  requestCreateCategory: vi.fn(async () => ok<void>(undefined)),
  requestCreateProduct: vi.fn(async () => ok<void>(undefined)),
  requestCreatePresentation: vi.fn(async () => ok<void>(undefined)),
  createPurchase: vi.fn(async () =>
    ok({
      localId: "pur-1",
      tenantId: "tenant-demo",
      warehouseLocalId: "wh-1",
      status: "draft" as const,
      currency: "USD" as const,
      exchangeRate: 1,
      subtotal: 10,
      total: 10,
      items: [{ productLocalId: "prod-1", qty: 1, unitCost: 10 }],
      receivedItems: [],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    })
  ),
  receivePurchase: vi.fn(async () =>
    ok({
      localId: "rec-1",
      tenantId: "tenant-demo",
      purchaseLocalId: "pur-1",
      warehouseLocalId: "wh-1",
      status: "posted" as const,
      items: [{ productLocalId: "prod-1", qty: 1, unitCost: 10 }],
      totalItems: 1,
      totalCost: 10,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    })
  ),
  listPurchases: vi.fn(async () => ok([])),
  listReceivings: vi.fn(async () => ok([])),
  listInventoryLots: vi.fn(async () => ok([])),
  confirmPurchase: vi.fn(async () => ok({
    localId: "pur-1",
    tenantId: "tenant-demo",
    warehouseLocalId: "wh-1",
    status: "confirmed" as const,
    currency: "USD" as const,
    exchangeRate: 1,
    subtotal: 10,
    total: 10,
    items: [{ productLocalId: "prod-1", qty: 1, unitCost: 10 }],
    receivedItems: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  })),
  cancelPurchase: vi.fn(async () => ok({
    localId: "pur-1",
    tenantId: "tenant-demo",
    warehouseLocalId: "wh-1",
    status: "cancelled" as const,
    currency: "USD" as const,
    exchangeRate: 1,
    subtotal: 10,
    total: 10,
    items: [{ productLocalId: "prod-1", qty: 1, unitCost: 10 }],
    receivedItems: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  })),
  editPurchase: vi.fn(async () => ok({
    localId: "pur-1",
    tenantId: "tenant-demo",
    warehouseLocalId: "wh-1",
    status: "draft" as const,
    currency: "USD" as const,
    exchangeRate: 1,
    subtotal: 20,
    total: 20,
    items: [{ productLocalId: "prod-1", qty: 2, unitCost: 10 }],
    receivedItems: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  })),
  setProductPreferredSupplier: vi.fn(async () => ok<void>(undefined))
});

describe("usePurchases", () => {
  it("propaga errores en lastError", async () => {
    const service = createServiceMock();
    vi.mocked(service.createPurchase).mockResolvedValueOnce(
      err({
        code: "PURCHASES_ITEMS_REQUIRED",
        message: "La compra requiere al menos un item.",
        retryable: false,
        timestamp: new Date().toISOString()
      } as AppError)
    );

    const { result } = renderHook(() =>
      usePurchases({
        service,
        tenant: { tenantSlug: "tenant-demo" },
        actor: {
          role: "owner",
          permissions: {
            canApplyDiscount: true,
            maxDiscountPercent: 20,
            canApplyCustomPrice: true,
            canVoidSale: true,
            canRefundSale: true,
            canVoidInvoice: true,
            canAdjustStock: true
          }
        }
      })
    );

    await act(async () => {
      await result.current.createPurchase({
        warehouseLocalId: "wh-1",
        items: []
      });
    });

    expect(result.current.state.lastError?.code).toBe("PURCHASES_ITEMS_REQUIRED");
  });
});
