import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ok, type AppError } from "@logiscore/core";
import { useInventory } from "../hooks/useInventory";
import type { InventoryService } from "../services/inventory.service";

const createServiceMock = (): InventoryService => ({
  createWarehouse: vi.fn(async () =>
    ok({
      localId: "wh-1",
      tenantId: "tenant-demo",
      name: "Principal",
      isActive: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    })
  ),
  listWarehouses: vi.fn(async () => ok([])),
  createProductSizeColor: vi.fn(async () =>
    ok({
      localId: "psc-1",
      tenantId: "tenant-demo",
      productLocalId: "prod-1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    })
  ),
  listProductSizeColors: vi.fn(async () => ok([])),
  recordStockMovement: vi.fn(async () =>
    ok({
      localId: "mv-1",
      tenantId: "tenant-demo",
      productLocalId: "prod-1",
      warehouseLocalId: "wh-1",
      movementType: "purchase_in",
      quantity: 1,
      createdAt: "2026-01-01T00:00:00.000Z"
    })
  ),
  listStockMovements: vi.fn(async () => ok([])),
  getStockBalance: vi.fn(async () => ok(0)),
  createInventoryCount: vi.fn(async () =>
    ok({
      localId: "ic-1",
      tenantId: "tenant-demo",
      warehouseLocalId: "wh-1",
      productLocalId: "prod-1",
      expectedQty: 0,
      countedQty: 0,
      differenceQty: 0,
      status: "draft",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    })
  ),
  postInventoryCount: vi.fn(async () =>
    ok({
      localId: "ic-1",
      tenantId: "tenant-demo",
      warehouseLocalId: "wh-1",
      productLocalId: "prod-1",
      expectedQty: 0,
      countedQty: 0,
      differenceQty: 0,
      status: "posted",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    })
  ),
  listInventoryCounts: vi.fn(async () => ok([])),
  getReorderSuggestions: vi.fn(async () => ok([]))
});

describe("useInventory", () => {
  it("expone estado inicial", () => {
    const { result } = renderHook(() =>
      useInventory({
        service: createServiceMock(),
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

    expect(result.current.state.isLoading).toBe(false);
    expect(result.current.state.lastError as AppError | null).toBeNull();
  });
});
