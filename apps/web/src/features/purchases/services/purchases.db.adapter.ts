import {
  db,
  type InventoryLotRecord,
  type PurchaseRecord,
  type ReceivingRecord,
  type StockMovementRecord,
  type SupplierRecord
} from "@/lib/db/dexie";
import type { PurchasesDb } from "./purchases.service";
import type { Purchase, Receiving, InventoryLot, Supplier } from "../types/purchases.types";

function toSupplierRecord(s: Supplier): SupplierRecord {
  const record: SupplierRecord = {
    localId: s.localId,
    tenantId: s.tenantId,
    name: s.name,
    isActive: s.isActive,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt
  };
  if (s.rif) record.rif = s.rif;
  if (s.phone) record.phone = s.phone;
  if (s.contactPerson) record.contactPerson = s.contactPerson;
  if (s.notes) record.notes = s.notes;
  if (s.deletedAt) record.deletedAt = s.deletedAt;
  return record;
}

function fromSupplierRecord(r: SupplierRecord): Supplier {
  const s: Supplier = {
    localId: r.localId,
    tenantId: r.tenantId,
    name: r.name,
    isActive: r.isActive,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt
  };
  if (r.rif) s.rif = r.rif;
  if (r.phone) s.phone = r.phone;
  if (r.contactPerson) s.contactPerson = r.contactPerson;
  if (r.notes) s.notes = r.notes;
  if (r.deletedAt) s.deletedAt = r.deletedAt;
  return s;
}

function toPurchaseRecord(p: Purchase): PurchaseRecord {
  const record: PurchaseRecord = {
    localId: p.localId,
    tenantId: p.tenantId,
    warehouseLocalId: p.warehouseLocalId,
    status: p.status,
    currency: p.currency,
    exchangeRate: p.exchangeRate,
    subtotal: p.subtotal,
    total: p.total,
    items: p.items,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt
  };
  if (p.supplierLocalId) record.supplierLocalId = p.supplierLocalId;
  if (p.supplierName) record.supplierName = p.supplierName;
  if (p.receivedItems?.length) record.receivedItems = p.receivedItems;
  if (p.createdBy) record.createdBy = p.createdBy;
  if (p.receivedAt) record.receivedAt = p.receivedAt;
  if (p.deletedAt) record.deletedAt = p.deletedAt;
  return record;
}

function fromPurchaseRecord(r: PurchaseRecord): Purchase {
  const p: Purchase = {
    localId: r.localId,
    tenantId: r.tenantId,
    warehouseLocalId: r.warehouseLocalId,
    status: r.status,
    currency: r.currency,
    exchangeRate: r.exchangeRate,
    subtotal: r.subtotal,
    total: r.total,
    items: r.items,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt
  };
  if (r.supplierLocalId) p.supplierLocalId = r.supplierLocalId;
  if (r.supplierName) p.supplierName = r.supplierName;
  if (r.receivedItems) p.receivedItems = r.receivedItems;
  if (r.createdBy) p.createdBy = r.createdBy;
  if (r.receivedAt) p.receivedAt = r.receivedAt;
  if (r.deletedAt) p.deletedAt = r.deletedAt;
  return p;
}

export class DexiePurchasesDbAdapter implements PurchasesDb {
  async createSupplier(supplier: Supplier): Promise<void> {
    await db.suppliers.put(toSupplierRecord(supplier));
  }

  async updateSupplier(supplier: Supplier): Promise<void> {
    await db.suppliers.put(toSupplierRecord(supplier));
  }

  async softDeleteSupplier(localId: string, tenantId: string, deletedAt: string): Promise<void> {
    const supplier = await db.suppliers.get(localId);
    if (supplier && supplier.tenantId === tenantId) {
      await db.suppliers.put({ ...supplier, deletedAt });
    }
  }

  async listSuppliers(tenantId: string): Promise<Supplier[]> {
    const records = await db.suppliers
      .where("tenantId")
      .equals(tenantId)
      .and((item) => !item.deletedAt)
      .sortBy("createdAt");
    return records.map(fromSupplierRecord);
  }

  async getSupplierByLocalId(tenantId: string, localId: string): Promise<Supplier | undefined> {
    const supplier = await db.suppliers.get(localId);
    if (!supplier || supplier.tenantId !== tenantId || supplier.deletedAt) {
      return undefined;
    }
    return fromSupplierRecord(supplier);
  }

  async createPurchase(purchase: Purchase): Promise<void> {
    await db.purchases.put(toPurchaseRecord(purchase));
  }

  async updatePurchase(purchase: Partial<Purchase> & { localId: string }): Promise<void> {
    const existing = await db.purchases.get(purchase.localId);
    if (!existing) return;
    
    const updateData: Partial<PurchaseRecord> = {};
    if (purchase.status !== undefined) updateData.status = purchase.status;
    if (purchase.items !== undefined) updateData.items = purchase.items;
    if (purchase.subtotal !== undefined) updateData.subtotal = purchase.subtotal;
    if (purchase.total !== undefined) updateData.total = purchase.total;
    if (purchase.receivedItems !== undefined) updateData.receivedItems = purchase.receivedItems;
    if (purchase.receivedAt !== undefined) updateData.receivedAt = purchase.receivedAt;
    if (purchase.updatedAt !== undefined) updateData.updatedAt = purchase.updatedAt;
    
    await db.purchases.update(purchase.localId, updateData);
  }

  async listPurchases(tenantId: string): Promise<Purchase[]> {
    const records = await db.purchases
      .where("tenantId")
      .equals(tenantId)
      .and((item) => !item.deletedAt)
      .sortBy("createdAt");
    return records.map(fromPurchaseRecord);
  }

  async getPurchaseByLocalId(
    tenantId: string,
    localId: string
  ): Promise<Purchase | undefined> {
    const purchase = await db.purchases.get(localId);
    if (!purchase || purchase.tenantId !== tenantId || purchase.deletedAt) {
      return undefined;
    }
    return fromPurchaseRecord(purchase);
  }

  async listReceivings(tenantId: string): Promise<Receiving[]> {
    const records = await db.receivings
      .where("tenantId")
      .equals(tenantId)
      .and((item) => !item.deletedAt)
      .sortBy("createdAt");
    return records.map((r) => {
      const item: Receiving = {
        localId: r.localId,
        tenantId: r.tenantId,
        purchaseLocalId: r.purchaseLocalId,
        warehouseLocalId: r.warehouseLocalId,
        status: r.status,
        items: r.items,
        totalItems: r.totalItems,
        totalCost: r.totalCost,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
      };
      if (r.receivedBy) item.receivedBy = r.receivedBy;
      if (r.notes) item.notes = r.notes;
      if (r.deletedAt) item.deletedAt = r.deletedAt;
      return item;
    });
  }

  async listInventoryLots(tenantId: string): Promise<InventoryLot[]> {
    const records = await db.inventory_lots
      .where("tenantId")
      .equals(tenantId)
      .and((item) => !item.deletedAt)
      .sortBy("createdAt");
    return records.map((r) => ({
      localId: r.localId,
      tenantId: r.tenantId,
      productLocalId: r.productLocalId,
      warehouseLocalId: r.warehouseLocalId,
      sourceType: r.sourceType,
      sourceLocalId: r.sourceLocalId,
      quantity: r.quantity,
      unitCost: r.unitCost,
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    }));
  }

  async receivePurchase(
    tenantId: string,
    purchaseLocalId: string,
    purchasePatch: Partial<Purchase>,
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
        
        const updateData: Partial<PurchaseRecord> = {};
        if (purchasePatch.status !== undefined) updateData.status = purchasePatch.status;
        if (purchasePatch.receivedItems !== undefined) updateData.receivedItems = purchasePatch.receivedItems;
        if (purchasePatch.receivedAt !== undefined) updateData.receivedAt = purchasePatch.receivedAt;
        if (purchasePatch.updatedAt !== undefined) updateData.updatedAt = purchasePatch.updatedAt;
        
        await db.purchases.update(purchaseLocalId, updateData);
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

  async updateProductPreferredSupplier(
    tenantId: string,
    productLocalId: string,
    supplierLocalId: string | null
  ): Promise<void> {
    const product = await db.products.get(productLocalId);
    if (!product || product.tenantId !== tenantId) return;
    await db.products.update(productLocalId, { preferredSupplierLocalId: supplierLocalId });
  }

  async getProductByLocalId(
    tenantId: string,
    localId: string
  ): Promise<{ localId: string; tenantId: string; preferredSupplierLocalId?: string | null } | undefined> {
    const product = await db.products.get(localId);
    if (!product || product.tenantId !== tenantId) return undefined;
    return {
      localId: product.localId,
      tenantId: product.tenantId,
      ...(product.preferredSupplierLocalId !== undefined ? { preferredSupplierLocalId: product.preferredSupplierLocalId } : {})
    };
  }
}