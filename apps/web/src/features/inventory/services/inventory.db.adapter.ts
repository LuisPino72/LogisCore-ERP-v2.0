/**
 * Adaptador de base de datos local para inventario (Dexie/IndexedDB).
 * Implementa la interfaz InventoryDb con operaciones CRUD y de negocio.
 */

import {
  db,
  type InventoryCountRecord,
  type InventoryLotRecord,
  type ProductSizeColorRecord,
  type StockMovementRecord,
  type WarehouseRecord
} from "@/lib/db/dexie";
import type { InventoryDb } from "./inventory.service";

// Tipos de movimiento que incrementan el stock
const incomingMovementTypes = new Set<StockMovementRecord["movementType"]>([
  "purchase_in",
  "adjustment_in",
  "production_in",
  "transfer_in",
  "count_adjustment"
]);

export class DexieInventoryDbAdapter implements InventoryDb {
  async createWarehouse(warehouse: WarehouseRecord): Promise<void> {
    await db.warehouses.put(warehouse);
  }

  async listWarehouses(tenantId: string): Promise<WarehouseRecord[]> {
    return db.warehouses
      .where("tenantId")
      .equals(tenantId)
      .and((item) => !item.deletedAt)
      .sortBy("createdAt");
  }

  async createProductSizeColor(item: ProductSizeColorRecord): Promise<void> {
    await db.product_size_colors.put(item);
  }

  async listProductSizeColors(tenantId: string): Promise<ProductSizeColorRecord[]> {
    return db.product_size_colors
      .where("tenantId")
      .equals(tenantId)
      .and((item) => !item.deletedAt)
      .sortBy("createdAt");
  }

  async createStockMovement(movement: StockMovementRecord): Promise<void> {
    await db.stock_movements.put(movement);
  }

  async listStockMovements(tenantId: string): Promise<StockMovementRecord[]> {
    return db.stock_movements
      .where("tenantId")
      .equals(tenantId)
      .and((item) => !item.deletedAt)
      .sortBy("createdAt");
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
          !item.deletedAt &&
          item.productLocalId === productLocalId &&
          item.warehouseLocalId === warehouseLocalId
      )
      .toArray();

    const balance = movements.reduce((acc, item) => {
      const signed = incomingMovementTypes.has(item.movementType)
        ? item.quantity
        : -item.quantity;
      return acc + signed;
    }, 0);

    return Number(balance.toFixed(4));
  }

  async createInventoryCount(count: InventoryCountRecord): Promise<void> {
    await db.inventory_counts.put(count);
  }

  async listInventoryCounts(tenantId: string): Promise<InventoryCountRecord[]> {
    return db.inventory_counts
      .where("tenantId")
      .equals(tenantId)
      .and((item) => !item.deletedAt)
      .sortBy("createdAt");
  }

  async getInventoryCountById(
    tenantId: string,
    localId: string
  ): Promise<InventoryCountRecord | null> {
    const item = await db.inventory_counts.get(localId);
    if (!item || item.tenantId !== tenantId || item.deletedAt) {
      return null;
    }
    return item;
  }

  async postInventoryCount(
    tenantId: string,
    localId: string,
    updatedCount: InventoryCountRecord,
    movement?: StockMovementRecord
  ): Promise<void> {
    await db.transaction(
      "rw",
      db.inventory_counts,
      db.stock_movements,
      async () => {
        const existing = await db.inventory_counts.get(localId);
        if (!existing || existing.tenantId !== tenantId) {
          return;
        }
        await db.inventory_counts.put(updatedCount);
        if (movement) {
          await db.stock_movements.put(movement);
        }
      }
    );
  }

  async listInventoryLots(tenantId: string): Promise<InventoryLotRecord[]> {
    return db.inventory_lots
      .where("tenantId")
      .equals(tenantId)
      .and((item) => !item.deletedAt)
      .sortBy("createdAt");
  }

  async createInventoryLot(lot: InventoryLotRecord): Promise<void> {
    await db.inventory_lots.put(lot);
  }

  async updateInventoryLot(lot: InventoryLotRecord): Promise<void> {
    await db.inventory_lots.put(lot);
  }
}

