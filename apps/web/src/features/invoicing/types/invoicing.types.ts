import type { AppError } from "@logiscore/core";

export interface InvoicingTenantContext {
  tenantSlug: string;
}

export interface InvoicingActorPermissions {
  canApplyDiscount: boolean;
  maxDiscountPercent: number;
  canApplyCustomPrice: boolean;
  canVoidSale: boolean;
  canRefundSale: boolean;
  canVoidInvoice: boolean;
  canAdjustStock: boolean;
  allowedWarehouseLocalIds?: string[];
}

export interface InvoicingActorContext {
  role: "owner" | "employee" | "super_admin";
  userId?: string;
  permissions: InvoicingActorPermissions;
}

export type InvoiceStatus = "draft" | "issued" | "voided";

export interface InvoiceItem {
  productLocalId: string;
  description: string;
  qty: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  subtotal: number;
  discountPercent?: number;
  discountAmount?: number;
}

export interface InvoicePayment {
  method: "cash" | "card" | "transfer" | "mobile" | "mixed";
  currency: "VES" | "USD";
  amount: number;
  reference?: string;
}

export interface Invoice {
  localId: string;
  tenantId: string;
  saleLocalId?: string;
  customerId?: string;
  customerName?: string;
  customerRif?: string;
  invoiceNumber?: string;
  pointOfSale?: string;
  controlNumber?: string;
  status: InvoiceStatus;
  currency: "VES" | "USD";
  exchangeRate: number;
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  igtfAmount: number;
  total: number;
  items: InvoiceItem[];
  payments: InvoicePayment[];
  notes?: string;
  issuedAt?: string;
  voidedAt?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface TaxRule {
  localId: string;
  tenantId: string;
  name: string;
  rate: number;
  type: "iva" | "islr" | "igtf";
  isWithholding: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface ExchangeRate {
  localId: string;
  tenantId: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  source: string;
  validFrom: string;
  validTo?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CreateInvoiceFromSaleInput {
  saleLocalId: string;
  customerId?: string;
  customerName?: string;
  customerRif?: string;
  notes?: string;
}

export interface VoidInvoiceInput {
  invoiceLocalId: string;
  reason: string;
}

export interface InvoicingUiState {
  isLoading: boolean;
  isSubmitting: boolean;
  invoices: Invoice[];
  taxRules: TaxRule[];
  exchangeRates: ExchangeRate[];
  lastError: AppError | null;
}