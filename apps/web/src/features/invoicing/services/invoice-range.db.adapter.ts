import { db, type InvoiceRangeRecord } from "@/lib/db/dexie";
import type { InvoiceRangeDb } from "./invoice-range.service";

export class DexieInvoiceRangeDbAdapter implements InvoiceRangeDb {
  async getActiveRange(tenantId: string): Promise<InvoiceRangeRecord | undefined> {
    return db.invoice_ranges
      .where("tenantId")
      .equals(tenantId)
      .and((item) => !item.deletedAt && item.isActive)
      .first();
  }

  async updateRange(
    tenantId: string,
    localId: string,
    patch: Partial<InvoiceRangeRecord>
  ): Promise<void> {
    await db.invoice_ranges.update(localId, patch);
  }
}

export const invoiceRangeDb = new DexieInvoiceRangeDbAdapter();