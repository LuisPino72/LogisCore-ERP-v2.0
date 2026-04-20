import { db } from "@/lib/db/dexie";

// Tipos locales para evitar `any` y satisfacer eslint/ts
type AnyRecord = Record<string, unknown>;

/**
 * Helper adapter que lee las stores normalizadas y recompone los objetos padre
 * de forma que los servicios existentes puedan seguir usando las mismas shapes.
 */
export const normalizedDb = {
  async getSaleWithItems(saleLocalId: string) {
    const sale = await db.sales.get(saleLocalId as unknown as string);
    if (!sale) return null;
    const items = await db.sale_items.where("saleLocalId").equals(saleLocalId).toArray();
    const payments = await db.sale_payments.where("saleLocalId").equals(saleLocalId).toArray();
    return {
      ...sale,
      items: items.map((it) => ({
        productLocalId: (it as AnyRecord).productLocalId as string,
        qty: (it as AnyRecord).qty as number,
        unitPrice: (it as AnyRecord).unitPrice as number,
        unitCost: (it as AnyRecord).unitCost as number | null,
        taxAmount: (it as AnyRecord).taxAmount as number | undefined,
        discountAmount: (it as AnyRecord).discountAmount as number | undefined
      })),
      payments: payments.map((p) => ({
        method: (p as AnyRecord).method as string,
        currency: (p as AnyRecord).currency as string,
        amount: (p as AnyRecord).amount as number,
        reference: (p as AnyRecord).reference as string | null
      }))
    };
  },

  async listSalesWithItems(tenantId: string) {
    const sales = await db.sales.where("tenantId").equals(tenantId).and((s) => !(s as AnyRecord).deletedAt).sortBy("createdAt");
    const result: unknown[] = [];
    for (const s of sales) {
      const full = await normalizedDb.getSaleWithItems((s as AnyRecord).localId as string);
      result.push(full ?? s);
    }
    return result as AnyRecord[];
  },

  async getInvoiceWithItems(invoiceLocalId: string) {
    const inv = await db.invoices.get(invoiceLocalId as unknown as string);
    if (!inv) return null;
    const items = await db.invoice_items.where("invoiceLocalId").equals(invoiceLocalId).toArray();
    const payments = await db.invoice_payments.where("invoiceLocalId").equals(invoiceLocalId).toArray();
    return {
      ...inv,
      items: items.map((it) => ({
        productLocalId: (it as AnyRecord).productLocalId as string,
        description: (it as AnyRecord).description as string | null,
        qty: (it as AnyRecord).qty as number,
        unitPrice: (it as AnyRecord).unitPrice as number,
        taxRate: (it as AnyRecord).taxRate as number | undefined,
        taxAmount: (it as AnyRecord).taxAmount as number | undefined,
        subtotal: (it as AnyRecord).subtotal as number | undefined,
        discountPercent: (it as AnyRecord).discountPercent as number | undefined,
        discountAmount: (it as AnyRecord).discountAmount as number | undefined
      })),
      payments: payments.map((p) => ({
        method: (p as AnyRecord).method as string,
        currency: (p as AnyRecord).currency as string,
        amount: (p as AnyRecord).amount as number,
        reference: (p as AnyRecord).reference as string | null
      }))
    };
  },

  async listInvoicesWithItems(tenantId: string) {
    const invoices = await db.invoices.where("tenantId").equals(tenantId).and((i) => !(i as AnyRecord).deletedAt).sortBy("createdAt");
    const result: unknown[] = [];
    for (const inv of invoices) {
      const full = await normalizedDb.getInvoiceWithItems((inv as AnyRecord).localId as string);
      result.push(full ?? inv);
    }
    return result as AnyRecord[];
  },

  async getPurchaseWithItems(purchaseLocalId: string) {
    const p = await db.purchases.get(purchaseLocalId as unknown as string);
    if (!p) return null;
    const items = await db.purchase_items.where("purchaseLocalId").equals(purchaseLocalId).toArray();
    const received = await db.purchase_received_items.where("purchaseLocalId").equals(purchaseLocalId).toArray();
    return {
      ...p,
      items: items.map((it) => ({ productLocalId: (it as AnyRecord).productLocalId as string, qty: (it as AnyRecord).qty as number, unitCost: (it as AnyRecord).unitCost as number })),
      receivedItems: received.map((it) => ({ productLocalId: (it as AnyRecord).productLocalId as string, qtyReceived: (it as AnyRecord).qtyReceived as number }))
    };
  },

  async listPurchasesWithItems(tenantId: string) {
    const purchases = await db.purchases.where("tenantId").equals(tenantId).and((p) => !(p as AnyRecord).deletedAt).sortBy("createdAt");
    const result: unknown[] = [];
    for (const pu of purchases) {
      const full = await normalizedDb.getPurchaseWithItems((pu as AnyRecord).localId as string);
      result.push(full ?? pu);
    }
    return result as AnyRecord[];
  },

  async getReceivingWithItems(receivingLocalId: string) {
    const r = await db.receivings.get(receivingLocalId as unknown as string);
    if (!r) return null;
    const items = await db.receiving_items.where("receivingLocalId").equals(receivingLocalId).toArray();
    const received = await db.receiving_received_items.where("receivingLocalId").equals(receivingLocalId).toArray();
    return {
      ...r,
      items: items.map((it) => ({ productLocalId: (it as AnyRecord).productLocalId as string, qty: (it as AnyRecord).qty as number, unitCost: (it as AnyRecord).unitCost as number })),
      receivedItems: received.map((it) => ({ productLocalId: (it as AnyRecord).productLocalId as string, qtyReceived: (it as AnyRecord).qtyReceived as number }))
    };
  },

  async listReceivingsWithItems(tenantId: string) {
    const receivings = await db.receivings.where("tenantId").equals(tenantId).and((r) => !(r as AnyRecord).deletedAt).sortBy("createdAt");
    const result: unknown[] = [];
    for (const rc of receivings) {
      const full = await normalizedDb.getReceivingWithItems((rc as AnyRecord).localId as string);
      result.push(full ?? rc);
    }
    return result as AnyRecord[];
  },

  async getRecipeWithIngredients(recipeLocalId: string) {
    const r = await db.recipes.get(recipeLocalId as unknown as string);
    if (!r) return null;
    const ingr = await db.recipe_ingredients.where("recipeLocalId").equals(recipeLocalId).toArray();
    return {
      ...r,
      ingredients: ingr.map((i) => ({ productLocalId: (i as AnyRecord).productLocalId as string, requiredQty: (i as AnyRecord).requiredQty as number }))
    };
  },

  async listRecipesWithIngredients(tenantId: string) {
    const recipes = await db.recipes.where("tenantId").equals(tenantId).and((r) => !(r as AnyRecord).deletedAt).sortBy("createdAt");
    const result: unknown[] = [];
    for (const rc of recipes) {
      const full = await normalizedDb.getRecipeWithIngredients((rc as AnyRecord).localId as string);
      result.push(full ?? rc);
    }
    return result as AnyRecord[];
  },

  async getProductionLogWithIngredients(productionLogLocalId: string) {
    const pl = await db.production_logs.get(productionLogLocalId as unknown as string);
    if (!pl) return null;
    const ingr = await db.production_ingredients.where("productionLogLocalId").equals(productionLogLocalId).toArray();
    return {
      ...pl,
      ingredientsUsed: ingr.map((i) => ({ productLocalId: (i as AnyRecord).productLocalId as string, qtyUsed: (i as AnyRecord).qtyUsed as number, qtyPlanned: (i as AnyRecord).qtyPlanned as number | undefined, costPerUnit: (i as AnyRecord).costPerUnit as number | undefined }))
    };
  },

  async listProductionLogsWithIngredients(tenantId: string) {
    const logs = await db.production_logs.where("tenantId").equals(tenantId).and((p) => !(p as AnyRecord).deletedAt).sortBy("createdAt");
    const result: unknown[] = [];
    for (const lg of logs) {
      const full = await normalizedDb.getProductionLogWithIngredients((lg as AnyRecord).localId as string);
      result.push(full ?? lg);
    }
    return result as AnyRecord[];
  }
};

export default normalizedDb;
