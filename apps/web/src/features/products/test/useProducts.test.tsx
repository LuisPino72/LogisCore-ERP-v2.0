import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ok } from "@logiscore/core";
import { useProducts } from "../hooks/useProducts";
import type { ProductsService } from "../services/products.service";

const createProductsServiceMock = (): ProductsService => ({
  createCategory: vi.fn(async (tenant, actor, input) => {
    void tenant;
    void actor;
    void input;
    return ok({
      localId: "c-1",
      tenantId: "tenant-demo",
      name: "Bebidas",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    });
  }),
  createProduct: vi.fn(async (tenant, actor, input) => {
    void tenant;
    void actor;
    void input;
    return ok({
      localId: "p-1",
      tenantId: "tenant-demo",
      name: "Coca Cola",
      visible: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    });
  }),
  createPresentation: vi.fn(async (tenant, actor, input) => {
    void tenant;
    void actor;
    void input;
    return ok({
      id: "pr-1",
      tenantId: "tenant-demo",
      productLocalId: "p-1",
      name: "Caja",
      factor: 12,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    });
  }),
  listCategories: vi.fn(async () =>
    ok([
      {
        localId: "c-1",
        tenantId: "tenant-demo",
        name: "Bebidas",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z"
      }
    ])
  ),
  listProducts: vi.fn(async () =>
    ok([
      {
        localId: "p-1",
        tenantId: "tenant-demo",
        name: "Coca Cola",
        visible: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z"
      }
    ])
  ),
  listPresentations: vi.fn(async () =>
    ok([
      {
        id: "pr-1",
        tenantId: "tenant-demo",
        productLocalId: "p-1",
        name: "Caja",
        factor: 12,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z"
      }
    ])
  ),
  updateCategory: vi.fn(async () =>
    ok({
      localId: "c-1",
      tenantId: "tenant-demo",
      name: "Bebidas",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    })
  ),
  updateProduct: vi.fn(async () =>
    ok({
      localId: "p-1",
      tenantId: "tenant-demo",
      name: "Coca Cola",
      visible: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    })
  ),
  deleteCategory: vi.fn(async () => ok<void>(undefined)),
  deleteProduct: vi.fn(async () => ok<void>(undefined))
});

describe("useProducts", () => {
  it("refresca categorias y productos", async () => {
    const service = createProductsServiceMock();
    const { result } = renderHook(() =>
      useProducts({
        service,
        tenant: { tenantSlug: "tenant-demo" },
        actor: {
          role: "owner",
          permissions: {
            canApplyDiscount: true,
            maxDiscountPercent: 10,
            canApplyCustomPrice: true,
            canVoidSale: false,
            canRefundSale: false,
            canVoidInvoice: false,
            canAdjustStock: true
          }
        }
      })
    );

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.state.categories).toHaveLength(1);
    expect(result.current.state.products).toHaveLength(1);
    expect(result.current.state.presentations).toHaveLength(1);
  });
});
