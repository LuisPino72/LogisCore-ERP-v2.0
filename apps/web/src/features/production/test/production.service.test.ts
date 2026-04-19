import { describe, expect, it, vi } from "vitest";
import { InMemoryEventBus, ok, type SyncEngine } from "@logiscore/core";
import type { StockMovementRecord } from "@/lib/db/dexie";
import {
  createProductionService,
  type ProductionDb
} from "../services/production.service";
import type { ProductionLog, ProductionOrder, Recipe } from "../types/production.types";

const createSyncEngineMock = (): SyncEngine => ({
  enqueue: vi.fn(async () => ok<void>(undefined)),
  processNext: vi.fn(async () => ok<"processed" | "skipped">("skipped")),
  startPeriodicSync: vi.fn(),
  stopPeriodicSync: vi.fn(),
  getStatus: vi.fn(() => "idle" as const)
});

const createDbMock = (initialStockMovements: StockMovementRecord[] = []): ProductionDb => {
  const recipes = new Map<string, Recipe>();
  const orders = new Map<string, ProductionOrder>();
  const logs = new Map<string, ProductionLog>();
  const stockMovements: StockMovementRecord[] = [...initialStockMovements];

  return {
    async createRecipe(recipe) {
      recipes.set(recipe.localId, recipe);
    },
    async listRecipes(tenantId) {
      return [...recipes.values()].filter((item) => item.tenantId === tenantId);
    },
    async getRecipeByLocalId(tenantId, recipeLocalId) {
      const recipe = recipes.get(recipeLocalId);
      if (!recipe || recipe.tenantId !== tenantId) {
        return undefined;
      }
      return recipe;
    },
    async createProductionOrder(order) {
      orders.set(order.localId, order);
    },
    async listProductionOrders(tenantId) {
      return [...orders.values()].filter((item) => item.tenantId === tenantId);
    },
    async getProductionOrderByLocalId(tenantId, productionOrderLocalId) {
      const order = orders.get(productionOrderLocalId);
      if (!order || order.tenantId !== tenantId) {
        return undefined;
      }
      return order;
    },
    async updateProductionOrder(tenantId, productionOrderLocalId, patch) {
      const order = orders.get(productionOrderLocalId);
      if (!order || order.tenantId !== tenantId) {
        return;
      }
      orders.set(productionOrderLocalId, { ...order, ...patch });
    },
    async listProductionLogs(tenantId) {
      return [...logs.values()].filter((item) => item.tenantId === tenantId);
    },
    async completeOrderWithLogAndMovements(
      tenantId,
      productionOrderLocalId,
      orderPatch,
      log,
      movements
    ) {
      const order = orders.get(productionOrderLocalId);
      if (!order || order.tenantId !== tenantId) {
        return;
      }
      orders.set(productionOrderLocalId, { ...order, ...orderPatch });
      logs.set(log.localId, log);
      stockMovements.push(...movements);
    },
    async getStockBalance(tenantId, productLocalId, warehouseLocalId) {
      return stockMovements
        .filter(
          (item) =>
            item.tenantId === tenantId &&
            item.productLocalId === productLocalId &&
            item.warehouseLocalId === warehouseLocalId
        )
        .reduce((acc, item) => {
          if (
            item.movementType === "purchase_in" ||
            item.movementType === "adjustment_in" ||
            item.movementType === "production_in" ||
            item.movementType === "transfer_in" ||
            item.movementType === "count_adjustment"
          ) {
            return acc + item.quantity;
          }
          return acc - item.quantity;
        }, 0);
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
    maxDiscountPercent: 20,
    canApplyCustomPrice: true,
    canVoidSale: true,
    canRefundSale: true,
    canVoidInvoice: true,
    canAdjustStock: true,
    allowedWarehouseLocalIds: []
  }
};

describe("production.service", () => {
  const tenantWithProduction = { tenantSlug: "tenant-demo", features: { production: true } };

  it("rechaza completar orden con stock insuficiente", async () => {
    const db = createDbMock();
    const service = createProductionService({
      db,
      syncEngine: createSyncEngineMock(),
      eventBus: new InMemoryEventBus()
    });

    const recipe = await service.createRecipe(
      tenantWithProduction,
      ownerActor,
      {
        productLocalId: "prod-finished",
        name: "Receta A",
        yieldQty: 1,
        ingredients: [{ productLocalId: "prod-raw", requiredQty: 2 }]
      }
    );
    expect(recipe.ok).toBe(true);
    if (!recipe.ok) {
      return;
    }

    const createdOrder = await service.createProductionOrder(
      tenantWithProduction,
      ownerActor,
      {
        recipeLocalId: recipe.data.localId,
        warehouseLocalId: "wh-1",
        plannedQty: 1
      }
    );
    expect(createdOrder.ok).toBe(true);
    if (!createdOrder.ok) {
      return;
    }

    await service.startProductionOrder(
      tenantWithProduction,
      ownerActor,
      { productionOrderLocalId: createdOrder.data.localId }
    );

    const completed = await service.completeProductionOrder(
      tenantWithProduction,
      ownerActor,
      {
        productionOrderLocalId: createdOrder.data.localId,
        producedQty: 1
      }
    );

    expect(completed.ok).toBe(false);
    if (completed.ok) {
      return;
    }
    expect(completed.error.code).toBe("PRODUCTION_STOCK_INSUFFICIENT");
  });

  it("completa orden y registra log con movimientos", async () => {
    const db = createDbMock([
      {
        localId: "stock-seed",
        tenantId: "tenant-demo",
        productLocalId: "prod-raw",
        warehouseLocalId: "wh-1",
        movementType: "purchase_in",
        quantity: 10,
        unitCost: 0,
        referenceType: "purchase",
        referenceLocalId: "ref-1",
        createdAt: "2026-01-01T00:00:00.000Z"
      }
    ]);

    const service = createProductionService({
      db,
      syncEngine: createSyncEngineMock(),
      eventBus: new InMemoryEventBus()
    });

    const recipe = await service.createRecipe(
      tenantWithProduction,
      ownerActor,
      {
        productLocalId: "prod-finished",
        name: "Receta B",
        yieldQty: 2,
        ingredients: [{ productLocalId: "prod-raw", requiredQty: 4 }]
      }
    );
    expect(recipe.ok).toBe(true);
    if (!recipe.ok) {
      return;
    }

    const order = await service.createProductionOrder(
      tenantWithProduction,
      ownerActor,
      {
        recipeLocalId: recipe.data.localId,
        warehouseLocalId: "wh-1",
        plannedQty: 2
      }
    );
    expect(order.ok).toBe(true);
    if (!order.ok) {
      return;
    }

    await service.startProductionOrder(
      tenantWithProduction,
      ownerActor,
      { productionOrderLocalId: order.data.localId }
    );

    const completed = await service.completeProductionOrder(
      tenantWithProduction,
      ownerActor,
      {
        productionOrderLocalId: order.data.localId,
        producedQty: 2
      }
    );

    expect(completed.ok).toBe(true);
    if (!completed.ok) {
      return;
    }
    expect(completed.data.ingredientsUsed).toHaveLength(1);

    const logs = await service.listProductionLogs({ tenantSlug: "tenant-demo" });
    expect(logs.ok).toBe(true);
    if (!logs.ok) {
      return;
    }
    expect(logs.data.length).toBeGreaterThan(0);
  });
});
