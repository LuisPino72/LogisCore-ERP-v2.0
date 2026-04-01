import {
  db,
  type InventoryLotRecord,
  type PurchaseRecord,
  type ReceivingRecord,
  type StockMovementRecord
} from "@/lib/db/dexie";
import type { PurchasesDb } from "./purchases.service";

export class DexiePurchasesDbAdapter implements PurchasesDb {
  async createPurchase(purchase: PurchaseRecord): Promise<void> {
    await db.purchases.put(purchase);
  }

  async listPurchases(tenantId: string): Promise<PurchaseRecord[]> {
    return db.purchases
      .where("tenantId")
      .equals(tenantId)
      .and((item) => !item.deletedAt)
      .sortBy("createdAt");
  }

  async getPurchaseByLocalId(
    tenantId: string,
    localId: string
  ): Promise<PurchaseRecord | undefined> {
    const purchase = await db.purchases.get(localId);
    if (!purchase || purchase.tenantId !== tenantId || purchase.deletedAt) {
      return undefined;
    }
    return purchase;
  }

  async listReceivings(tenantId: string): Promise<ReceivingRecord[]> {
    return db.receivings
      .where("tenantId")
      .equals(tenantId)
      .and((item) => !item.deletedAt)
      .sortBy("createdAt");
  }

  async listInventoryLots(tenantId: string): Promise<InventoryLotRecord[]> {
    return db.inventory_lots
      .where("tenantId")
      .equals(tenantId)
      .and((item) => !item.deletedAt)
      .sortBy("createdAt");
  }

  async receivePurchase(
    tenantId: string,
    purchaseLocalId: string,
    purchasePatch: Pick<PurchaseRecord, "status" | "receivedAt" | "updatedAt">,
    receiving: ReceivingRecord,
    stockMovements: StockMovementRecord[],
    inventoryLots: InventoryLotRecord[]
  ): Promise<void> {
    await db.transaction(
      "rw",
      db.purchases,
      db.receivings,
      db.stock_movements,
      db.inventory_lots,
      async () => {
        const purchase = await db.purchases.get(purchaseLocalId);
        if (!purchase || purchase.tenantId !== tenantId || purchase.deletedAt) {
          return;
        }
        await db.purchases.update(purchaseLocalId, purchasePatch);
        await db.receivings.put(receiving);
        if (stockMovements.length) {
          await db.stock_movements.bulkPut(stockMovements);
        }
        if (inventoryLots.length) {
          await db.inventory_lots.bulkPut(inventoryLots);
        }
      }
    );
  }
}
