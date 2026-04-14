import type { Page } from '@playwright/test';

export interface DexieRecord {
  localId?: string;
  tenantId?: string;
  [key: string]: unknown;
}

export class DexieUtil {
  constructor(private page: Page) {}

  async getDb(): Promise<unknown> {
    return this.page.evaluate(() => {
      return (window as unknown as { logiscoreDb?: unknown }).logiscoreDb ?? null;
    });
  }

  async query(table: string, query: Record<string, unknown>): Promise<DexieRecord[]> {
    return this.page.evaluate(
      ([t, q]) => {
        const db = (window as unknown as { logiscoreDb?: Record<string, unknown> }).logiscoreDb;
        if (!db?.[t]) return [];
        const tableObj = db[t] as { where: (q: Record<string, unknown>) => { toArray: () => Promise<DexieRecord[]> } };
        const whereClause = tableObj?.where?.(q);
        return whereClause?.toArray() ?? [];
      },
      [table, query]
    );
  }

  async get(table: string, localId: string): Promise<DexieRecord | undefined> {
    return this.page.evaluate(
      ([t, id]) => {
        const db = (window as unknown as { logiscoreDb?: Record<string, unknown> }).logiscoreDb;
        if (!db?.[t]) return undefined;
        const tableObj = db[t] as { get: (id: string) => Promise<DexieRecord> };
        return tableObj?.get?.(id) ?? undefined;
      },
      [table, localId]
    );
  }

  async getByIndex(table: string, index: string, value: unknown): Promise<DexieRecord[]> {
    return this.page.evaluate(
      ([t, idx, val]) => {
        const db = (window as unknown as { logiscoreDb?: Record<string, unknown> }).logiscoreDb;
        if (!db?.[t]) return [];
        const tableObj = db[t] as { where: (idx: string) => { equals: (val: unknown) => { toArray: () => Promise<DexieRecord[]> } } };
        return tableObj?.where?.(idx)?.equals?.(val)?.toArray() ?? [];
      },
      [table, index, value]
    );
  }

  async exists(table: string, localId: string): Promise<boolean> {
    const record = await this.get(table, localId);
    return record !== undefined;
  }

  async count(table: string, tenantId: string): Promise<number> {
    return this.page.evaluate(
      ([t, tid]) => {
        const db = (window as unknown as { logiscoreDb?: Record<string, unknown> }).logiscoreDb;
        if (!db?.[t]) return 0;
        const tableObj = db[t] as { where: (idx: string) => { equals: (val: string) => { count: () => Promise<number> } } };
        return tableObj?.where?.('tenantId')?.equals?.(tid)?.count() ?? 0;
      },
      [table, tenantId]
    );
  }

  async clearTenantData(tenantId: string): Promise<void> {
    await this.page.evaluate(async (tid) => {
      const win = window as unknown as { logiscoreDb?: Record<string, unknown> };
      const db = win.logiscoreDb;
      if (!db) return;
      const tables = [
        'products', 'sales', 'suspended_sales', 'inventory_lots',
        'stock_movements', 'security_audit_log', 'sync_queue', 'sync_errors',
        'categories', 'warehouses', 'product_presentations', 'box_closings'
      ];
      for (const table of tables) {
        const tableObj = db[table] as { where: (idx: string) => { equals: (val: string) => { delete: () => Promise<number> } } } | undefined;
        if (tableObj?.where) {
          await tableObj.where('tenantId').equals(tid).delete();
        }
      }
    }, tenantId);
  }

  async verifyTenantIdIsSlug(tenantId: string): Promise<boolean> {
    return this.page.evaluate((tid) => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return !uuidRegex.test(tid);
    }, tenantId);
  }

  async getLastSale(tenantId: string): Promise<DexieRecord | undefined> {
    const sales = await this.page.evaluate(
      (tid) => {
        const db = (window as unknown as { logiscoreDb?: Record<string, unknown> }).logiscoreDb;
        if (!db?.sales) return [];
        const salesTable = db.sales as { where: (idx: string) => { equals: (val: string) => { reverse: () => { limit: (n: number) => { toArray: () => Promise<DexieRecord[]> } } } } };
        return salesTable?.where?.('tenantId')?.equals?.(tid)?.reverse()?.limit(1)?.toArray() ?? [];
      },
      tenantId
    );
    return sales[0];
  }

  async getSuspendedSalesCount(tenantId: string): Promise<number> {
    return this.count('suspended_sales', tenantId);
  }

  async getSyncErrors(tenantId: string): Promise<DexieRecord[]> {
    return this.getByIndex('sync_errors', 'tenantId', tenantId);
  }

  async getAuditLogs(tenantId: string, eventType?: string): Promise<DexieRecord[]> {
    if (eventType) {
      return this.page.evaluate(
        ([tid, et]) => {
          const db = (window as unknown as { logiscoreDb?: Record<string, unknown> }).logiscoreDb;
          if (!db?.security_audit_log) return [];
          const tableObj = db.security_audit_log as { where: (idx: string) => { equals: (val: string) => { and: (fn: (r: DexieRecord) => boolean) => { toArray: () => Promise<DexieRecord[]> } } } };
          return tableObj?.where?.('tenantId')?.equals?.(tid)?.and?.((r: DexieRecord) => r.eventType === et)?.toArray() ?? [];
        },
        [tenantId, eventType]
      );
    }
    return this.getByIndex('security_audit_log', 'tenantId', tenantId);
  }

  async getInventoryLots(productLocalId: string, warehouseLocalId: string): Promise<DexieRecord[]> {
    return this.page.evaluate(
      ([prodId, whId]) => {
        const db = (window as unknown as { logiscoreDb?: Record<string, unknown> }).logiscoreDb;
        if (!db?.inventory_lots) return [];
        const tableObj = db.inventory_lots as { where: (idx: string) => { equals: (val: string) => { and: (fn: (r: DexieRecord) => boolean) => { toArray: () => Promise<DexieRecord[]> } } } };
        return tableObj?.where?.('productLocalId')?.equals?.(prodId)?.and?.((r: DexieRecord) => r.warehouseLocalId === whId)?.toArray() ?? [];
      },
      [productLocalId, warehouseLocalId]
    );
  }

  async getActiveInventoryLots(productLocalId: string, warehouseLocalId: string): Promise<DexieRecord[]> {
    return this.page.evaluate(
      ([prodId, whId]) => {
        const db = (window as unknown as { logiscoreDb?: Record<string, unknown> }).logiscoreDb;
        if (!db?.inventory_lots) return [];
        const tableObj = db.inventory_lots as { where: (idx: string) => { equals: (val: string) => { and: (fn: (r: DexieRecord) => boolean) => { toArray: () => Promise<DexieRecord[]> } } } };
        return tableObj?.where?.('productLocalId')?.equals?.(prodId)?.and?.((r: DexieRecord) => r.warehouseLocalId === whId && r.status === 'active')?.toArray() ?? [];
      },
      [productLocalId, warehouseLocalId]
    );
  }

  async getStockMovements(tenantId: string): Promise<DexieRecord[]> {
    return this.getByIndex('stock_movements', 'tenantId', tenantId);
  }

  async getInvoices(tenantId: string): Promise<DexieRecord[]> {
    return this.getByIndex('invoices', 'tenantId', tenantId);
  }

  async getWarehouses(tenantId: string): Promise<DexieRecord[]> {
    return this.getByIndex('warehouses', 'tenantId', tenantId);
  }

  async getCategories(tenantId: string): Promise<DexieRecord[]> {
    return this.getByIndex('categories', 'tenantId', tenantId);
  }

  async getProductPresentation(productLocalId: string): Promise<DexieRecord[]> {
    return this.page.evaluate((prodId) => {
      const db = (window as unknown as { logiscoreDb?: Record<string, unknown> }).logiscoreDb;
      if (!db?.product_presentations) return [];
      const tableObj = db.product_presentations as { where: (idx: string) => { equals: (val: string) => { toArray: () => Promise<DexieRecord[]> } } };
      return tableObj?.where?.('productLocalId')?.equals?.(prodId)?.toArray() ?? [];
    }, productLocalId);
  }

  async getLastStockMovement(tenantId: string): Promise<DexieRecord | undefined> {
    const movements = await this.page.evaluate(
      (tid) => {
        const db = (window as unknown as { logiscoreDb?: Record<string, unknown> }).logiscoreDb;
        if (!db?.stock_movements) return [];
        const tableObj = db.stock_movements as { where: (idx: string) => { equals: (val: string) => { reverse: () => { limit: (n: number) => { toArray: () => Promise<DexieRecord[]> } } } } };
        return tableObj?.where?.('tenantId')?.equals?.(tid)?.reverse()?.limit(1)?.toArray() ?? [];
      },
      tenantId
    );
    return movements[0];
  }

  async getExchangeRates(tenantId: string): Promise<DexieRecord[]> {
    return this.getByIndex('exchange_rates', 'tenantId', tenantId);
  }
}