import {
  createAppError,
  err,
  ok,
  type AppError,
  type EventBus,
  type Result,
  type SyncEngine
} from "@logiscore/core";
import type {
  CreateInvoiceFromSaleInput,
  ExchangeRate,
  InvoicingActorContext,
  InvoicingTenantContext,
  Invoice,
  InvoiceItem,
  TaxRule,
  VoidInvoiceInput
} from "../types/invoicing.types";

export interface InvoicingDb {
  createInvoice(invoice: Invoice): Promise<void>;
  listInvoices(tenantId: string): Promise<Invoice[]>;
  getInvoiceByLocalId(tenantId: string, invoiceLocalId: string): Promise<Invoice | undefined>;
  updateInvoice(
    tenantId: string,
    invoiceLocalId: string,
    patch: Partial<Invoice>
  ): Promise<void>;
  listTaxRules(tenantId: string): Promise<TaxRule[]>;
  getActiveTaxRules(tenantId: string): Promise<TaxRule[]>;
  listExchangeRates(tenantId: string): Promise<ExchangeRate[]>;
  getCurrentExchangeRate(
    tenantId: string,
    fromCurrency: string,
    toCurrency: string
  ): Promise<ExchangeRate | undefined>;
}

export interface InvoicingService {
  createInvoiceFromSale(
    tenant: InvoicingTenantContext,
    actor: InvoicingActorContext,
    input: CreateInvoiceFromSaleInput
  ): Promise<Result<Invoice, AppError>>;
  voidInvoice(
    tenant: InvoicingTenantContext,
    actor: InvoicingActorContext,
    input: VoidInvoiceInput
  ): Promise<Result<Invoice, AppError>>;
  listInvoices(tenant: InvoicingTenantContext): Promise<Result<Invoice[], AppError>>;
  listTaxRules(tenant: InvoicingTenantContext): Promise<Result<TaxRule[], AppError>>;
  listExchangeRates(tenant: InvoicingTenantContext): Promise<Result<ExchangeRate[], AppError>>;
}

interface CreateInvoicingServiceDependencies {
  db: InvoicingDb;
  syncEngine: SyncEngine;
  eventBus: EventBus;
  clock?: () => Date;
  uuid?: () => string;
}

export const createInvoicingService = ({
  db,
  syncEngine,
  eventBus,
  clock = () => new Date(),
  uuid = () => crypto.randomUUID()
}: CreateInvoicingServiceDependencies): InvoicingService => {
  const roundMoney = (value: number): number =>
    Math.round((value + Number.EPSILON) * 100) / 100;

  const computeTaxRateFromRules = async (
    tenantId: string,
    type: "iva" | "islr" | "igtf"
  ): Promise<number> => {
    const rules = await db.getActiveTaxRules(tenantId);
    const rule = rules.find((r) => r.type === type && r.isActive);
    return rule?.rate ?? 0;
  };

  const computeInvoiceTotals = async (
    tenantId: string,
    items: InvoiceItem[],
    currency: "VES" | "USD",
    exchangeRate: number,
    igtfRate: number
  ): Promise<{ subtotal: number; taxTotal: number; igtfAmount: number; total: number }> => {
    let subtotal = 0;
    let taxTotal = 0;

    for (const item of items) {
      const itemSubtotal = item.qty * item.unitPrice;
      let itemDiscount = 0;
      if (item.discountPercent) {
        itemDiscount = itemSubtotal * (item.discountPercent / 100);
      } else if (item.discountAmount) {
        itemDiscount = item.discountAmount;
      }
      const taxableSubtotal = itemSubtotal - itemDiscount;
      const taxAmount = taxableSubtotal * (item.taxRate / 100);
      subtotal += taxableSubtotal;
      taxTotal += roundMoney(taxAmount);
    }

    const totalBeforeIgtf = subtotal + taxTotal;
    let igtfAmount = 0;
    if (igtfRate > 0) {
      igtfAmount = roundMoney(totalBeforeIgtf * (igtfRate / 100));
    }

    return {
      subtotal: roundMoney(subtotal),
      taxTotal: roundMoney(taxTotal),
      igtfAmount,
      total: roundMoney(totalBeforeIgtf + igtfAmount)
    };
  };

  const createInvoiceFromSale: InvoicingService["createInvoiceFromSale"] = async (
    tenant,
    actor,
    input
  ) => {
    if (!input.saleLocalId.trim()) {
      return err(
        createAppError({
          code: "SALE_LOCAL_ID_REQUIRED",
          message: "El ID de venta es obligatorio.",
          retryable: false
        })
      );
    }

    if (actor.role !== "owner" && actor.role !== "super_admin" && !actor.permissions.canVoidInvoice) {
      return err(
        createAppError({
          code: "INVOICE_PERMISSION_DENIED",
          message: "No tiene permisos para crear facturas.",
          retryable: false
        })
      );
    }

    const ivaRate = await computeTaxRateFromRules(tenant.tenantSlug, "iva");
    const igtfRate = await computeTaxRateFromRules(tenant.tenantSlug, "igtf");

    const now = clock().toISOString();
    const localId = uuid();
    const invoiceNumber = `${String(Date.now()).slice(-8)}`;

    const mockItems: InvoiceItem[] = [
      {
        productLocalId: "mock",
        description: "Items from sale",
        qty: 1,
        unitPrice: 0,
        taxRate: ivaRate,
        taxAmount: 0,
        subtotal: 0
      }
    ];

    const totals = await computeInvoiceTotals(
      tenant.tenantSlug,
      mockItems,
      "VES",
      1,
      igtfRate
    );

    const invoice: Invoice = {
      localId,
      tenantId: tenant.tenantSlug,
      saleLocalId: input.saleLocalId,
      customerName: input.customerName ?? "",
      customerRif: input.customerRif ?? "",
      invoiceNumber,
      status: "draft",
      currency: "VES",
      exchangeRate: 1,
      subtotal: totals.subtotal,
      taxTotal: totals.taxTotal,
      discountTotal: 0,
      igtfAmount: totals.igtfAmount,
      total: totals.total,
      items: mockItems,
      payments: [],
      notes: input.notes ?? "",
      createdAt: now,
      updatedAt: now,
      ...(input.customerId ? { customerId: input.customerId } : {})
    };

    const queue = await syncEngine.enqueue({
      id: uuid(),
      table: "invoices",
      operation: "create",
      payload: {
        local_id: invoice.localId,
        tenant_slug: tenant.tenantSlug,
        sale_local_id: invoice.saleLocalId ?? null,
        customer_name: invoice.customerName ?? null,
        customer_rif: invoice.customerRif ?? null,
        invoice_number: invoice.invoiceNumber ?? null,
        status: invoice.status,
        currency: invoice.currency,
        exchange_rate: invoice.exchangeRate,
        subtotal: invoice.subtotal,
        tax_total: invoice.taxTotal,
        discount_total: invoice.discountTotal,
        igtf_amount: invoice.igtfAmount,
        total: invoice.total,
        items: invoice.items,
        created_at: invoice.createdAt,
        updated_at: invoice.updatedAt
      },
      localId: invoice.localId,
      tenantId: tenant.tenantSlug,
      createdAt: now,
      attempts: 0
    });
    if (!queue.ok) {
      return err(queue.error);
    }

    await db.createInvoice(invoice);
    eventBus.emit("INVOICE.CREATED", {
      tenantId: tenant.tenantSlug,
      localId: invoice.localId
    });
    return ok(invoice);
  };

  const voidInvoice: InvoicingService["voidInvoice"] = async (
    tenant,
    actor,
    input
  ) => {
    if (!input.invoiceLocalId.trim()) {
      return err(
        createAppError({
          code: "INVOICE_LOCAL_ID_REQUIRED",
          message: "El ID de factura es obligatorio.",
          retryable: false
        })
      );
    }

    if (actor.role !== "owner" && actor.role !== "super_admin") {
      if (!actor.permissions.canVoidInvoice) {
        return err(
          createAppError({
            code: "INVOICE_VOID_PERMISSION_DENIED",
            message: "No tiene permisos para anular facturas.",
            retryable: false
          })
        );
      }
    }

    const invoice = await db.getInvoiceByLocalId(
      tenant.tenantSlug,
      input.invoiceLocalId
    );
    if (!invoice) {
      return err(
        createAppError({
          code: "INVOICE_NOT_FOUND",
          message: "La factura no existe.",
          retryable: false,
          context: { invoiceLocalId: input.invoiceLocalId }
        })
      );
    }

    if (invoice.status === "voided") {
      return err(
        createAppError({
          code: "INVOICE_ALREADY_VOIDED",
          message: "La factura ya esta anulada.",
          retryable: false,
          context: { invoiceLocalId: input.invoiceLocalId }
        })
      );
    }

    if (invoice.status === "issued" && invoice.saleLocalId) {
      return err(
        createAppError({
          code: "INVOICE_LINKED_TO_SALE",
          message: "No se puede anular una factura vinculada a una venta.",
          retryable: false,
          context: { invoiceLocalId: input.invoiceLocalId, saleLocalId: invoice.saleLocalId }
        })
      );
    }

    const now = clock().toISOString();
    const queue = await syncEngine.enqueue({
      id: uuid(),
      table: "invoices",
      operation: "update",
      payload: {
        local_id: invoice.localId,
        tenant_slug: tenant.tenantSlug,
        status: "voided",
        voided_at: now,
        updated_at: now
      },
      localId: invoice.localId,
      tenantId: tenant.tenantSlug,
      createdAt: now,
      attempts: 0
    });
    if (!queue.ok) {
      return err(queue.error);
    }

    await db.updateInvoice(tenant.tenantSlug, invoice.localId, {
      status: "voided",
      voidedAt: now,
      updatedAt: now
    });
    eventBus.emit("INVOICE.VOIDED", {
      tenantId: tenant.tenantSlug,
      localId: invoice.localId,
      reason: input.reason
    });
    return ok({ ...invoice, status: "voided", voidedAt: now, updatedAt: now });
  };

  const listInvoices: InvoicingService["listInvoices"] = async (tenant) =>
    ok(await db.listInvoices(tenant.tenantSlug));

  const listTaxRules: InvoicingService["listTaxRules"] = async (tenant) =>
    ok(await db.listTaxRules(tenant.tenantSlug));

  const listExchangeRates: InvoicingService["listExchangeRates"] = async (tenant) =>
    ok(await db.listExchangeRates(tenant.tenantSlug));

  return {
    createInvoiceFromSale,
    voidInvoice,
    listInvoices,
    listTaxRules,
    listExchangeRates
  };
};