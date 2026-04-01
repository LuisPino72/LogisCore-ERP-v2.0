import { describe, expect, it, vi } from "vitest";
import { InMemoryEventBus, ok } from "@logiscore/core";
import { createProductsPurchasesBridge } from "../services/products.purchases-bridge";
import type { ProductsService } from "../services/products.service";

describe("products.purchases-bridge", () => {
  it("consume eventos PURCHASES.* y delega en products.service", async () => {
    const eventBus = new InMemoryEventBus();
    const productsService: ProductsService = {
      createCategory: vi.fn(async () =>
        ok({
          localId: "c-1",
          tenantId: "tenant-demo",
          name: "Bebidas",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z"
        })
      ),
      createProduct: vi.fn(async () =>
        ok({
          localId: "p-1",
          tenantId: "tenant-demo",
          name: "Cafe",
          visible: true,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z"
        })
      ),
      createPresentation: vi.fn(async () =>
        ok({
          id: "pr-1",
          tenantId: "tenant-demo",
          productLocalId: "p-1",
          name: "Paquete",
          factor: 1,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z"
        })
      ),
      updateCategory: vi.fn(),
      updateProduct: vi.fn(),
      listCategories: vi.fn(),
      listProducts: vi.fn(),
      listPresentations: vi.fn(),
      deleteCategory: vi.fn(),
      deleteProduct: vi.fn()
    };

    const bridge = createProductsPurchasesBridge({ eventBus, productsService });
    bridge.setContext({
      tenant: { tenantSlug: "tenant-demo" },
      actor: {
        role: "owner",
        permissions: {
          canApplyDiscount: true,
          maxDiscountPercent: 10,
          canApplyCustomPrice: true,
          canVoidSale: true,
          canRefundSale: true,
          canVoidInvoice: true,
          canAdjustStock: true
        }
      }
    });

    const stop = bridge.start();

    eventBus.emit("PURCHASES.CATEGORY_CREATE_REQUESTED", { name: "Bebidas" });
    eventBus.emit("PURCHASES.PRODUCT_CREATE_REQUESTED", {
      name: "Cafe",
      visible: true
    });
    eventBus.emit("PURCHASES.PRESENTATION_CREATE_REQUESTED", {
      productLocalId: "p-1",
      name: "Paquete",
      factor: 1
    });

    await Promise.resolve();

    expect(productsService.createCategory).toHaveBeenCalledTimes(1);
    expect(productsService.createProduct).toHaveBeenCalledTimes(1);
    expect(productsService.createPresentation).toHaveBeenCalledTimes(1);

    stop();
  });
});
