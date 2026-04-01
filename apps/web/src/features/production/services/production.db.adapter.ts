import {
  db,
  type ProductionLogRecord,
  type ProductionOrderRecord,
  type RecipeRecord,
  type StockMovementRecord
} from "@/lib/db/dexie";
import type { ProductionDb } from "./production.service";

const incomingMovements = new Set<StockMovementRecord["movementType"]>([
  "purchase_in",
  "adjustment_in",
  "production_in",
  "transfer_in",
  "count_adjustment"
]);

export class DexieProductionDbAdapter implements ProductionDb {
  async createRecipe(recipe: RecipeRecord): Promise<void> {
    await db.recipes.put(recipe);
  }

  async listRecipes(tenantId: string): Promise<RecipeRecord[]> {
    return db.recipes
      .where("tenantId")
      .equals(tenantId)
      .and((item) => !item.deletedAt)
      .sortBy("createdAt");
  }

  async getRecipeByLocalId(
    tenantId: string,
    recipeLocalId: string
  ): Promise<RecipeRecord | undefined> {
    const recipe = await db.recipes.get(recipeLocalId);
    if (!recipe || recipe.tenantId !== tenantId || recipe.deletedAt) {
      return undefined;
    }
    return recipe;
  }

  async createProductionOrder(order: ProductionOrderRecord): Promise<void> {
    await db.production_orders.put(order);
  }

  async listProductionOrders(tenantId: string): Promise<ProductionOrderRecord[]> {
    return db.production_orders
      .where("tenantId")
      .equals(tenantId)
      .and((item) => !item.deletedAt)
      .sortBy("createdAt");
  }

  async getProductionOrderByLocalId(
    tenantId: string,
    productionOrderLocalId: string
  ): Promise<ProductionOrderRecord | undefined> {
    const order = await db.production_orders.get(productionOrderLocalId);
    if (!order || order.tenantId !== tenantId || order.deletedAt) {
      return undefined;
    }
    return order;
  }

  async updateProductionOrder(
    tenantId: string,
    productionOrderLocalId: string,
    patch: Partial<ProductionOrderRecord>
  ): Promise<void> {
    const order = await this.getProductionOrderByLocalId(tenantId, productionOrderLocalId);
    if (!order) {
      return;
    }
    await db.production_orders.update(order.localId, patch);
  }

  async listProductionLogs(tenantId: string): Promise<ProductionLogRecord[]> {
    return db.production_logs
      .where("tenantId")
      .equals(tenantId)
      .and((item) => !item.deletedAt)
      .sortBy("createdAt");
  }

  async completeOrderWithLogAndMovements(
    tenantId: string,
    productionOrderLocalId: string,
    orderPatch: Pick<
      ProductionOrderRecord,
      "status" | "producedQty" | "completedAt" | "updatedAt"
    >,
    log: ProductionLogRecord,
    stockMovements: StockMovementRecord[]
  ): Promise<void> {
    await db.transaction(
      "rw",
      db.production_orders,
      db.production_logs,
      db.stock_movements,
      async () => {
        const order = await this.getProductionOrderByLocalId(
          tenantId,
          productionOrderLocalId
        );
        if (!order) {
          return;
        }
        await db.production_orders.update(productionOrderLocalId, orderPatch);
        await db.production_logs.put(log);
        if (stockMovements.length) {
          await db.stock_movements.bulkPut(stockMovements);
        }
      }
    );
  }

  async getStockBalance(
    tenantId: string,
    productLocalId: string,
    warehouseLocalId: string
  ): Promise<number> {
    const movements = await db.stock_movements
      .where("tenantId")
      .equals(tenantId)
      .and(
        (item) =>
          item.productLocalId === productLocalId &&
          item.warehouseLocalId === warehouseLocalId &&
          !item.deletedAt
      )
      .sortBy("createdAt");

    return movements.reduce((acc, movement) => {
      if (incomingMovements.has(movement.movementType)) {
        return acc + movement.quantity;
      }
      return acc - movement.quantity;
    }, 0);
  }
}
