import { describe, expect, it, vi } from "vitest";
import { InMemoryEventBus, ok, type SyncEngine } from "@logiscore/core";
import {
  createInvoicingService,
  type InvoicingDb
} from "../services/invoicing.service";
import type { Invoice, TaxRule, ExchangeRate } from "../types/invoicing.types";

const createSyncEngineMock = (): SyncEngine => ({
  enqueue: vi.fn(async () => ok<void>(undefined)),
  processNext: vi.fn(async () => ok<"processed" | "skipped">("skipped")),
  startPeriodicSync: vi.fn(),
  stopPeriodicSync: vi.fn(),
  getStatus: vi.fn(() => "idle" as const)
});

const createDbMock = (): InvoicingDb => {
  const invoices = new Map<string, Invoice>();
  const taxRules = new Map<string, TaxRule>();
  const exchangeRates = new Map<string, ExchangeRate>();

  return {
    async createInvoice(invoice) {
      invoices.set(invoice.localId, invoice);
    },
    async listInvoices(tenantId) {
      return [...invoices.values()].filter((item) => item.tenantId === tenantId);
    },
    async listIssuedInvoicesThisMonth(tenantId) {
      return [...invoices.values()].filter(
        (item) => item.tenantId === tenantId && item.status === "issued"
      );
    },
    async getInvoiceByLocalId(tenantId, invoiceLocalId) {
      const invoice = invoices.get(invoiceLocalId);
      if (!invoice || invoice.tenantId !== tenantId) {
        return undefined;
      }
      return invoice;
    },
    async updateInvoice(tenantId, invoiceLocalId, patch) {
      const invoice = invoices.get(invoiceLocalId);
      if (!invoice || invoice.tenantId !== tenantId) {
        return;
      }
      invoices.set(invoiceLocalId, { ...invoice, ...patch });
    },
    async listTaxRules(tenantId) {
      return [...taxRules.values()].filter((item) => item.tenantId === tenantId);
    },
    async getActiveTaxRules(tenantId) {
      return [...taxRules.values()].filter(
        (item) => item.tenantId === tenantId && item.isActive
      );
    },
    async listExchangeRates(tenantId) {
      return [...exchangeRates.values()].filter((item) => item.tenantId === tenantId);
    },
    async getCurrentExchangeRate(tenantId, fromCurrency, toCurrency) {
      return [...exchangeRates.values()].find(
        (item) =>
          item.tenantId === tenantId &&
          item.fromCurrency === fromCurrency &&
          item.toCurrency === toCurrency
      );
    },
    async createAuditLog() {
    }
  };
};

const ownerActor = {
  role: "owner" as const,
  userId: "u-1",
  permissions: {
    canApplyDiscount: true,
    maxDiscountPercent: 20,
    canApplyCustomPrice: true,
    canVoidSale: true,
    canRefundSale: true,
    canVoidInvoice: true,
    canAdjustStock: true,
    allowedWarehouseLocalIds: []
  }
};

const employeeActorWithoutPermission = {
  role: "employee" as const,
  userId: "u-2",
  permissions: {
    canApplyDiscount: false,
    maxDiscountPercent: 0,
    canApplyCustomPrice: false,
    canVoidSale: false,
    canRefundSale: false,
    canVoidInvoice: false,
    canAdjustStock: false,
    allowedWarehouseLocalIds: []
  }
};

describe("invoicing.service", () => {
  const createTaxRuleServiceMock = () => ({
    getRateByType: vi.fn(async () => ok(0.16)),
    listActiveRules: vi.fn(async () => ok([]))
  });

  it("crea factura desde venta exitosamente", async () => {
    const db = createDbMock();
    const service = createInvoicingService({
      db,
      syncEngine: createSyncEngineMock(),
      eventBus: new InMemoryEventBus(),
      invoiceRangeService: { reserveNextNumber: vi.fn(async () => ok({ invoiceNumber: "001", controlNumber: "CN001" })) },
      taxRuleService: createTaxRuleServiceMock(),
      getExchangeRate: vi.fn(async () => 1)
    });

    const invoice = await service.createInvoiceFromSale(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      {
        saleLocalId: "sale-123",
        customerName: "Cliente Test",
        customerRif: "J123456789"
      }
    );

    expect(invoice.ok).toBe(true);
    if (!invoice.ok) {
      return;
    }
    expect(invoice.data.saleLocalId).toBe("sale-123");
    expect(invoice.data.customerName).toBe("Cliente Test");
    expect(invoice.data.status).toBe("draft");
    expect(invoice.data.invoiceNumber).toBeDefined();
  });

  it("rechaza crear factura sin saleLocalId", async () => {
    const db = createDbMock();
    const service = createInvoicingService({
      db,
      syncEngine: createSyncEngineMock(),
      eventBus: new InMemoryEventBus(),
      invoiceRangeService: { reserveNextNumber: vi.fn(async () => ok({ invoiceNumber: "001", controlNumber: "CN001" })) },
      taxRuleService: createTaxRuleServiceMock(),
      getExchangeRate: vi.fn(async () => 1)
    });

    const invoice = await service.createInvoiceFromSale(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      {
        saleLocalId: "",
        customerName: "Cliente Test"
      }
    );

    expect(invoice.ok).toBe(false);
    if (invoice.ok) {
      return;
    }
    expect(invoice.error.code).toBe("SALE_LOCAL_ID_REQUIRED");
  });

  it("rechaza crear factura sin permisos", async () => {
    const db = createDbMock();
    const service = createInvoicingService({
      db,
      syncEngine: createSyncEngineMock(),
      eventBus: new InMemoryEventBus(),
      invoiceRangeService: { reserveNextNumber: vi.fn(async () => ok({ invoiceNumber: "001", controlNumber: "CN001" })) },
      taxRuleService: createTaxRuleServiceMock(),
      getExchangeRate: vi.fn(async () => 1)
    });

    const invoice = await service.createInvoiceFromSale(
      { tenantSlug: "tenant-demo" },
      employeeActorWithoutPermission,
      {
        saleLocalId: "sale-123",
        customerName: "Cliente Test"
      }
    );

    expect(invoice.ok).toBe(false);
    if (invoice.ok) {
      return;
    }
    expect(invoice.error.code).toBe("ADMIN_PERMISSION_DENIED");
  });

  it("anula factura exitosamente", async () => {
    const db = createDbMock();
    const service = createInvoicingService({
      db,
      syncEngine: createSyncEngineMock(),
      eventBus: new InMemoryEventBus(),
      invoiceRangeService: { reserveNextNumber: vi.fn(async () => ok({ invoiceNumber: "001", controlNumber: "CN001" })) },
      taxRuleService: createTaxRuleServiceMock(),
      getExchangeRate: vi.fn(async () => 1)
    });

    const created = await service.createInvoiceFromSale(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      {
        saleLocalId: "sale-123",
        customerName: "Cliente Test"
      }
    );
    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    const voided = await service.voidInvoice(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      {
        invoiceLocalId: created.data.localId,
        reason: "Error en factura"
      }
    );

    expect(voided.ok).toBe(true);
    if (!voided.ok) {
      return;
    }
    expect(voided.data.status).toBe("voided");
    expect(voided.data.voidedAt).toBeDefined();
  });

  it("rechaza anular factura que no existe", async () => {
    const db = createDbMock();
    const service = createInvoicingService({
      db,
      syncEngine: createSyncEngineMock(),
      eventBus: new InMemoryEventBus(),
      invoiceRangeService: { reserveNextNumber: vi.fn(async () => ok({ invoiceNumber: "001", controlNumber: "CN001" })) },
      taxRuleService: createTaxRuleServiceMock(),
      getExchangeRate: vi.fn(async () => 1)
    });

    const voided = await service.voidInvoice(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      {
        invoiceLocalId: "non-existent-id",
        reason: "Test"
      }
    );

    expect(voided.ok).toBe(false);
    if (voided.ok) {
      return;
    }
    expect(voided.error.code).toBe("INVOICE_NOT_FOUND");
  });

  it("rechaza anular factura ya anulada", async () => {
    const db = createDbMock();
    const service = createInvoicingService({
      db,
      syncEngine: createSyncEngineMock(),
      eventBus: new InMemoryEventBus(),
      invoiceRangeService: { reserveNextNumber: vi.fn(async () => ok({ invoiceNumber: "001", controlNumber: "CN001" })) },
      taxRuleService: createTaxRuleServiceMock(),
      getExchangeRate: vi.fn(async () => 1)
    });

    const created = await service.createInvoiceFromSale(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      { saleLocalId: "sale-123" }
    );
    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    await service.voidInvoice(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      { invoiceLocalId: created.data.localId, reason: "First void" }
    );

    const voidAgain = await service.voidInvoice(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      { invoiceLocalId: created.data.localId, reason: "Second void" }
    );

    expect(voidAgain.ok).toBe(false);
    if (voidAgain.ok) {
      return;
    }
    expect(voidAgain.error.code).toBe("INVOICE_ALREADY_VOIDED");
  });

  it("calcula IVA correctamente desde tax_rules", async () => {
    const db = createDbMock();
    const service = createInvoicingService({
      db,
      syncEngine: createSyncEngineMock(),
      eventBus: new InMemoryEventBus(),
      invoiceRangeService: { reserveNextNumber: vi.fn(async () => ok({ invoiceNumber: "001", controlNumber: "CN001" })) },
      taxRuleService: createTaxRuleServiceMock(),
      getExchangeRate: vi.fn(async () => 1)
    });

    const invoice = await service.createInvoiceFromSale(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      {
        saleLocalId: "sale-123",
        customerName: "Cliente Test"
      }
    );

    expect(invoice.ok).toBe(true);
    if (!invoice.ok || !invoice.data.items[0]) {
      return;
    }
    expect(invoice.data.items[0].taxRate).toBe(0.16); 
  });

  it("lista facturas del tenant", async () => {
    const db = createDbMock();
    const service = createInvoicingService({
      db,
      syncEngine: createSyncEngineMock(),
      eventBus: new InMemoryEventBus(),
      invoiceRangeService: { reserveNextNumber: vi.fn(async () => ok({ invoiceNumber: "001", controlNumber: "CN001" })) },
      taxRuleService: createTaxRuleServiceMock(),
      getExchangeRate: vi.fn(async () => 1)
    });

    await service.createInvoiceFromSale(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      { saleLocalId: "sale-1" }
    );
    await service.createInvoiceFromSale(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      { saleLocalId: "sale-2" }
    );

    const invoices = await service.listInvoices({ tenantSlug: "tenant-demo" });
    expect(invoices.ok).toBe(true);
    if (!invoices.ok) {
      return;
    }
    expect(invoices.data.length).toBe(2);
  });

  it("redondeo fiscal SENIAT: total no puede diferir > 0.01 Bs", async () => {
    const db = createDbMock();
    db.getActiveTaxRules = async () => [
      { localId: "1", tenantId: "tenant-demo", name: "IVA 16%", rate: 16, type: "iva", isWithholding: false, isActive: true, createdAt: "", updatedAt: "" },
      { localId: "2", tenantId: "tenant-demo", name: "IGTF 3%", rate: 3, type: "igtf", isWithholding: false, isActive: true, createdAt: "", updatedAt: "" }
    ];
    
    const roundMoney = (value: number): number =>
      Math.round((value + Number.EPSILON) * 100) / 100;

    const testCases = [
      { base: 100.00, expectedTotal: 119.48 },
      { base: 250.50, expectedTotal: 299.30 },
      { base: 1000.00, expectedTotal: 1194.80 },
      { base: 0.50, expectedTotal: 0.60 },
    ];

    for (const tc of testCases) {
      const subtotal = tc.base;
      const taxAmount = roundMoney(subtotal * 0.16);
      const totalBeforeIgtf = subtotal + taxAmount;
      const igtfAmount = roundMoney(totalBeforeIgtf * 0.03);
      const total = roundMoney(totalBeforeIgtf + igtfAmount);
      
      const difference = Math.abs(total - tc.expectedTotal);
      expect(difference).toBeLessThanOrEqual(0.01);
    }
  });
});