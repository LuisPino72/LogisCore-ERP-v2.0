import {
  db,
  type BoxClosingRecord,
  type SaleRecord,
  type StockMovementRecord,
  type SuspendedSaleRecord
} from "@/lib/db/dexie";
import type { SalesDb } from "./sales.service";

export class DexieSalesDbAdapter implements SalesDb {
  async createSale(sale: SaleRecord): Promise<void> {
    await db.sales.put(sale);
  }

  async listSales(tenantId: string): Promise<SaleRecord[]> {
    return db.sales
      .where("tenantId")
      .equals(tenantId)
      .and((item) => !item.deletedAt)
      .sortBy("createdAt");
  }

  async createSuspendedSale(sale: SuspendedSaleRecord): Promise<void> {
    await db.suspended_sales.put(sale);
  }

  async listSuspendedSales(tenantId: string): Promise<SuspendedSaleRecord[]> {
    return db.suspended_sales
      .where("tenantId")
      .equals(tenantId)
      .and((item) => !item.deletedAt)
      .sortBy("createdAt");
  }

  async markSuspendedSaleConverted(
    tenantId: string,
    localId: string,
    updatedAt: string
  ): Promise<void> {
    const sale = await db.suspended_sales.get(localId);
    if (!sale || sale.tenantId !== tenantId) {
      return;
    }
    await db.suspended_sales.update(localId, { status: "converted", updatedAt });
  }

  async getSuspendedSaleByLocalId(
    tenantId: string,
    localId: string
  ): Promise<SuspendedSaleRecord | undefined> {
    const sale = await db.suspended_sales.get(localId);
    if (!sale || sale.tenantId !== tenantId || sale.deletedAt) {
      return undefined;
    }
    return sale;
  }

  async createBoxClosing(box: BoxClosingRecord): Promise<void> {
    await db.box_closings.put(box);
  }

  async getOpenBoxByWarehouse(
    tenantId: string,
    warehouseLocalId: string
  ): Promise<BoxClosingRecord | undefined> {
    const items = await db.box_closings
      .where("tenantId")
      .equals(tenantId)
      .and(
        (item) =>
          item.warehouseLocalId === warehouseLocalId &&
          item.status === "open" &&
          !item.deletedAt
      )
      .sortBy("createdAt");
    return items.at(-1);
  }

  async closeOpenBoxByWarehouse(
    tenantId: string,
    warehouseLocalId: string,
    closeData: Pick<
      BoxClosingRecord,
      "closedAt" | "closedBy" | "status" | "expectedAmount" | "countedAmount" | "differenceAmount" | "salesCount" | "updatedAt" | "metadata"
    >
  ): Promise<void> {
    const openBox = await this.getOpenBoxByWarehouse(tenantId, warehouseLocalId);
    if (!openBox) {
      return;
    }
    await db.box_closings.update(openBox.localId, closeData);
  }

  async listBoxClosings(tenantId: string): Promise<BoxClosingRecord[]> {
    return db.box_closings
      .where("tenantId")
      .equals(tenantId)
      .and((item) => !item.deletedAt)
      .sortBy("createdAt");
  }

  async createStockMovements(movements: StockMovementRecord[]): Promise<void> {
    await db.stock_movements.bulkPut(movements);
  }
}
