import type { AppError } from "@logiscore/core";

/**
 * Contexto del tenant para operaciones de facturación.
 * Identifica el tenant (empresa/organización) en curso.
 */
export interface InvoicingTenantContext {
  tenantSlug: string;
}

/**
 * Permisos del actor para operaciones de facturación.
 * Define qué operaciones puede realizar el usuario actual.
 */
export interface InvoicingActorPermissions {
  canApplyDiscount: boolean;
  maxDiscountPercent: number;
  canApplyCustomPrice: boolean;
  canVoidSale: boolean;
  canRefundSale: boolean;
  canVoidInvoice: boolean;
  canAdjustStock: boolean;
  allowedWarehouseLocalIds?: string[];
  // Nuevos permisos para operaciones avanzadas
  canCreatePurchaseOrders?: boolean;
  canApprovePurchaseOrders?: boolean;
  canCreateProductionOrders?: boolean;
  canApproveProductionOrders?: boolean;
  canManageUsers?: boolean;
  canManageTenants?: boolean;
}

/**
 * Contexto del actor (usuario) para operaciones de facturación.
 * Combina el rol y los permisos del usuario.
 */
/**
 * Contexto del actor (usuario) para operaciones de facturación.
 * Combina el rol y los permisos del usuario.
 */
export interface InvoicingActorContext {
  role: "owner" | "employee" | "admin";
  userId?: string;
  permissions: InvoicingActorPermissions;
}

/**
 * Estados posibles de una factura.
 */
export type InvoiceStatus = "draft" | "issued" | "voided";

/**
 * Ítem de línea de una factura.
 * Representa un producto o servicio facturado.
 */
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

/**
 * Pago de una factura.
 * Define el método, moneda y monto del pago.
 */
/**
 * Pago de una factura.
 * Define el método, moneda y monto del pago.
 */
export interface InvoicePayment {
  method: "cash" | "card" | "transfer" | "mobile" | "mixed";
  currency: "VES" | "USD";
  amount: number;
  reference?: string;
}

/**
 * Factura completa.
 * Representa un documento fiscal conitems, pagos y metadata SENIAT.
 */
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
  xmlSeniat?: string | null;
  jsonSeniat?: object | null;
  authorizationNumber?: string | null;
  issuedAt?: string;
  voidedAt?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

/**
 * Regla fiscal.
 * Define tasas de impuestos (IVA, ISLR, IGTF) y su jurisdicción.
 */
/**
 * Regla fiscal.
 * Define tasas de impuestos (IVA, ISLR, IGTF) y su jurisdicción.
 */
export interface TaxRule {
  localId: string;
  tenantId: string;
  name: string;
  rate: number;
  type: "iva" | "islr" | "igtf";
  isWithholding: boolean;
  isActive: boolean;
  jurisdiction?: string | null;
  efectivoDesde?: string;
  efectivoHasta?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

/**
 * Tipo de cambio de moneda.
 * Define la tasa de cambio entre dos monedas.
 */
/**
 * Tipo de cambio de moneda.
 * Define la tasa de cambio entre dos monedas.
 */
export interface ExchangeRate {
  localId: string;
  tenantId: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  source: string;
  jurisdiction?: string | null;
  validFrom: string;
  validTo?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

/**
 * Datos de entrada para crear una factura desde una venta.
 */
/**
 * Datos de entrada para crear una factura desde una venta.
 */
export interface CreateInvoiceFromSaleInput {
  saleLocalId: string;
  customerId?: string;
  customerName?: string;
  customerRif?: string;
  notes?: string;
}

/**
 * Datos de entrada para anular una factura.
 */
/**
 * Datos de entrada para anular una factura.
 */
export interface VoidInvoiceInput {
  invoiceLocalId: string;
  reason: string;
}

/**
 * Estado de la UI para el módulo de facturación.
 */
export interface InvoicingUiState {
  isLoading: boolean;
  isSubmitting: boolean;
  invoices: Invoice[];
  taxRules: TaxRule[];
  exchangeRates: ExchangeRate[];
  lastError: AppError | null;
}