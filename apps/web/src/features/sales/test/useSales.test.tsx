import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ok, type AppError } from "@logiscore/core";
import { useSales } from "../hooks/useSales";
import type { SalesService } from "../services/sales.service";

const createServiceMock = (): SalesService => ({
  createSuspendedSale: vi.fn(async () =>
    ok({
      localId: "ss-1",
      tenantId: "tenant-demo",
      warehouseLocalId: "wh-1",
      status: "open",
      cart: [],
      paymentsDraft: [],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    })
  ),
  createPosSale: vi.fn(async () =>
    ok({
      localId: "sale-1",
      tenantId: "tenant-demo",
      warehouseLocalId: "wh-1",
      status: "completed",
      currency: "VES",
      exchangeRate: 1,
      subtotal: 0,
      taxTotal: 0,
      discountTotal: 0,
      total: 0,
      totalPaid: 0,
      changeAmount: 0,
      items: [],
      payments: [],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    })
  ),
  openBox: vi.fn(async () =>
    ok({
      localId: "box-open-1",
      tenantId: "tenant-demo",
      warehouseLocalId: "wh-1",
      status: "open",
      openedAt: "2026-01-01T00:00:00.000Z",
      openingAmount: 10,
      metadata: {},
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    })
  ),
  closeBox: vi.fn(async () =>
    ok({
      localId: "box-1",
      tenantId: "tenant-demo",
      warehouseLocalId: "wh-1",
      status: "closed",
      openedAt: "2026-01-01T00:00:00.000Z",
      closedAt: "2026-01-01T08:00:00.000Z",
      openingAmount: 0,
      expectedAmount: 0,
      countedAmount: 0,
      differenceAmount: 0,
      salesCount: 0,
      metadata: {},
      createdAt: "2026-01-01T08:00:00.000Z",
      updatedAt: "2026-01-01T08:00:00.000Z"
    })
  ),
  restoreSuspendedSale: vi.fn(async () =>
    ok({
      sourceLocalId: "ss-1",
      warehouseLocalId: "wh-1",
      cart: [{ productLocalId: "prod-1", qty: 1, unitPrice: 10 }],
      paymentsDraft: []
    })
  ),
  listSales: vi.fn(async () => ok([])),
  listSuspendedSales: vi.fn(async () => ok([])),
  listBoxClosings: vi.fn(async () => ok([]))
});

describe("useSales", () => {
  it("expone estado inicial", () => {
    const { result } = renderHook(() =>
      useSales({
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

  it("restaura venta suspendida desde el servicio", async () => {
    const service = createServiceMock();
    const { result } = renderHook(() =>
      useSales({
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

    let restored: Awaited<ReturnType<typeof result.current.restoreSuspendedSale>> =
      null;
    await act(async () => {
      restored = await result.current.restoreSuspendedSale("ss-1");
    });
    expect(restored?.sourceLocalId).toBe("ss-1");
    expect(service.restoreSuspendedSale).toHaveBeenCalledOnce();
  });
});
