/**
 * Adaptador de base de datos local para facturación (Dexie/IndexedDB).
 * Implementa la interfaz InvoicingDb con operaciones CRUD y de negocio.
 */

import { db, type InvoiceRecord, type TaxRuleRecord, type ExchangeRateRecord, type SecurityAuditLogRecord } from "@/lib/db/dexie";
import { normalizedDb } from "@/lib/db/normalized";
import type { InvoicingDb } from "./invoicing.service";

export class DexieInvoicingDbAdapter implements InvoicingDb {
  async createInvoice(invoice: InvoiceRecord): Promise<void> {
    await db.invoices.put(invoice);
  }

  async listInvoices(tenantId: string): Promise<InvoiceRecord[]> {
    return normalizedDb.listInvoicesWithItems(tenantId) as Promise<InvoiceRecord[]>;
  }

  async getInvoiceByLocalId(
    tenantId: string,
    invoiceLocalId: string
  ): Promise<InvoiceRecord | undefined> {
    const invoice = await normalizedDb.getInvoiceWithItems(invoiceLocalId);
    if (!invoice || invoice.tenantId !== tenantId || invoice.deletedAt) {
      return undefined;
    }
    return invoice as InvoiceRecord;
  }

  async updateInvoice(
    tenantId: string,
    invoiceLocalId: string,
    patch: Partial<InvoiceRecord>
  ): Promise<void> {
    const invoice = await this.getInvoiceByLocalId(tenantId, invoiceLocalId);
    if (!invoice) {
      return;
    }
    await db.invoices.update(invoice.localId, patch);
  }

  async listTaxRules(tenantId: string): Promise<TaxRuleRecord[]> {
    return db.tax_rules
      .where("tenantId")
      .equals(tenantId)
      .and((item) => !item.deletedAt)
      .sortBy("createdAt");
  }

  async getActiveTaxRules(tenantId: string): Promise<TaxRuleRecord[]> {
    return db.tax_rules
      .where("tenantId")
      .equals(tenantId)
      .and((item) => !item.deletedAt && item.isActive)
      .toArray();
  }

  async listExchangeRates(tenantId: string): Promise<ExchangeRateRecord[]> {
    return db.exchange_rates
      .where("tenantId")
      .equals(tenantId)
      .and((item) => !item.deletedAt)
      .sortBy("createdAt");
  }

  async getCurrentExchangeRate(
    tenantId: string,
    fromCurrency: string,
    toCurrency: string
  ): Promise<ExchangeRateRecord | undefined> {
    const rates = await db.exchange_rates
      .where("tenantId")
      .equals(tenantId)
      .and(
        (item) =>
          !item.deletedAt &&
          item.fromCurrency === fromCurrency &&
          item.toCurrency === toCurrency &&
          (!item.validTo || new Date(item.validTo) >= new Date())
      )
      .toArray();
    return rates[0];
  }

  async listIssuedInvoicesThisMonth(tenantId: string): Promise<InvoiceRecord[]> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    return db.invoices
      .where("tenantId")
      .equals(tenantId)
      .and((item) => 
        !item.deletedAt && 
        item.status === "issued" &&
        item.issuedAt &&
        new Date(item.issuedAt) >= startOfMonth &&
        new Date(item.issuedAt) <= endOfMonth
      )
      .toArray();
  }

  async createAuditLog(log: Omit<SecurityAuditLogRecord, "localId">): Promise<void> {
    await db.security_audit_log.put({
      ...log,
      localId: crypto.randomUUID()
    });
  }
}
