/**
 * Adaptador de base de datos local para facturación (Dexie/IndexedDB).
 * Implementa la interfaz InvoicingDb con operaciones CRUD y de negocio.
 */

import { db, type InvoiceRecord, type TaxRuleRecord, type ExchangeRateRecord } from "@/lib/db/dexie";
import type { InvoicingDb } from "./invoicing.service";

export class DexieInvoicingDbAdapter implements InvoicingDb {
  async createInvoice(invoice: InvoiceRecord): Promise<void> {
    await db.invoices.put(invoice);
  }

  async listInvoices(tenantId: string): Promise<InvoiceRecord[]> {
    return db.invoices
      .where("tenantId")
      .equals(tenantId)
      .and((item) => !item.deletedAt)
      .sortBy("createdAt");
  }

  async getInvoiceByLocalId(
    tenantId: string,
    invoiceLocalId: string
  ): Promise<InvoiceRecord | undefined> {
    const invoice = await db.invoices.get(invoiceLocalId);
    if (!invoice || invoice.tenantId !== tenantId || invoice.deletedAt) {
      return undefined;
    }
    return invoice;
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
}