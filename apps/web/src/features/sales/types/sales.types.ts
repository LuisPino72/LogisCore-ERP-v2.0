/**
 * Módulo de Ventas y POS
 * Gestiona ventas, ventas suspendidas, caja y pagos
 */

import type { AppError } from "@logiscore/core";

/** Contexto del tenant */
export interface SalesTenantContext {
  tenantSlug: string;
}

/** Monedas soportadas */
export type SalesCurrency = "VES" | "USD";

/**
 * Permisos del actor en ventas
 */
export interface SalesActorPermissions {
  canApplyDiscount: boolean;
  maxDiscountPercent: number;
  canApplyCustomPrice: boolean;
  canVoidSale: boolean;
  canRefundSale: boolean;
  canVoidInvoice: boolean;
  canAdjustStock: boolean;
  allowedWarehouseLocalIds?: string[];
  canCreatePurchaseOrders?: boolean;
  canApprovePurchaseOrders?: boolean;
  canCreateProductionOrders?: boolean;
  canApproveProductionOrders?: boolean;
  canManageUsers?: boolean;
  canManageTenants?: boolean;
}

/** Contexto del usuario en ventas */
export interface SalesActorContext {
  role: "owner" | "employee" | "admin";
  userId?: string;
  permissions: SalesActorPermissions;
}

/**
 * Ítem (línea) de una venta
 * unitPrice: Precio unitario
 * qty: Cantidad
 * unitCost: Costo unitario (para calcular utilidad)
 * taxAmount: Monto de impuestos
 * discountAmount: Monto de descuento
 */
export interface SaleItem {
  productLocalId: string;
  qty: number;
  unitPrice: number;
  isWeighted?: boolean;
  unitCost?: number;
  taxAmount?: number;
  discountAmount?: number;
}

/**
 * Pago en una venta
 * method: Método de pago
 * currency: Moneda del pago
 * amount: Monto del pago
 * reference: Referencia del pago (número de transferencia, etc.)
 */
export interface SalePayment {
  method: "cash" | "card" | "transfer" | "mobile" | "mixed";
  currency: SalesCurrency;
  amount: number;
  reference?: string;
}

/**
 * Venta completada
 * status: Estado de la venta
 * salesPersonId: ID del vendedor (nullable)
 * posTerminalId: ID del terminal POS (nullable)
 * customerId: ID del cliente (nullable)
 */
export interface Sale {
  localId: string;
  tenantId: string;
  saleNumber: string;
  warehouseLocalId: string;
  cashierUserId: string;
  salesPersonId: string | null;
  posTerminalId: string | null;
  customerId: string | null;
  status: "draft" | "completed" | "voided" | "refunded";
  currency: SalesCurrency;
  exchangeRate: number;
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  igtfAmount: number;
  total: number;
  totalPaid: number;
  changeAmount: number;
  items: SaleItem[];
  payments: SalePayment[];
  suspendedSourceLocalId: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

/**
 * Venta suspendida (ticket guardado)
 * status: open=activa, resumed=restaurada, cancelled=cancelada, converted=convertida a venta
 * cart: Ítems del carrito
 * paymentsDraft: Pagos parciales
 */
export interface SuspendedSale {
  localId: string;
  tenantId: string;
  warehouseLocalId: string;
  cashierUserId: string;
  status: "open" | "resumed" | "cancelled" | "converted";
  cart: SaleItem[];
  paymentsDraft: SalePayment[];
  notes: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

/**
 * Cierre de caja
 * status: open=caja abierta, closed=caja cerrada
 * openingReading/closingReading: Lecturas de apertura/cierre (opcional)
 */
export interface BoxClosing {
  localId: string;
  tenantId: string;
  warehouseLocalId: string;
  openedBy: string;
  closedBy: string;
  status: "open" | "closed";
  openedAt: string;
  closedAt: string;
  openingAmount: number;
  expectedAmount: number;
  countedAmount: number;
  differenceAmount: number;
  salesCount: number;
  openingReading: string;
  closingReading: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

/** Input para crear venta suspendida */
export interface CreateSuspendedSaleInput {
  warehouseLocalId: string;
  cart: SaleItem[];
  paymentsDraft?: SalePayment[];
  notes?: string;
  expiresAt?: string;
}

/**
 * Input para crear venta POS
 * salesPersonId: ID del vendedor
 * posTerminalId: ID del terminal
 * customerId: ID del cliente
 */
export interface CreatePosSaleInput {
  saleNumber?: string;
  warehouseLocalId: string;
  currency: SalesCurrency;
  exchangeRate: number;
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  igtfAmount: number;
  total: number;
  totalPaid?: number;

  changeAmount?: number;
  items: SaleItem[];
  payments: SalePayment[];
  notes?: string;
  suspendedSourceLocalId?: string;
  salesPersonId?: string;
  posTerminalId?: string;
  customerId?: string;
}

/** Input para cerrar caja */
export interface CloseBoxInput {
  warehouseLocalId: string;
  countedAmount: number;
  notes?: string;
}

/** Input para abrir caja */
export interface OpenBoxInput {
  warehouseLocalId: string;
  openingAmount: number;
  openedAt?: string;
  notes?: string;
}

/** Resultado de restaurar venta suspendida */
export interface RestoreSuspendedSaleResult {
  sourceLocalId: string;
  warehouseLocalId: string;
  cart: SaleItem[];
  paymentsDraft: SalePayment[];
  notes: string;
}

/** Estado de UI del módulo de ventas */
export interface SalesUiState {
  isLoading: boolean;
  sales: Sale[];
  suspendedSales: SuspendedSale[];
  boxClosings: BoxClosing[];
  lastError: AppError | null;
}
