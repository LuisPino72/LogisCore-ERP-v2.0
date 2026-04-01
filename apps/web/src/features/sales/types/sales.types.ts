import type { AppError } from "@logiscore/core";

export interface SalesTenantContext {
  tenantSlug: string;
}

export type SalesCurrency = "VES" | "USD";

export interface SalesActorPermissions {
  canApplyDiscount: boolean;
  maxDiscountPercent: number;
  canApplyCustomPrice: boolean;
  canVoidSale: boolean;
  canRefundSale: boolean;
  canVoidInvoice: boolean;
  canAdjustStock: boolean;
  allowedWarehouseLocalIds?: string[];
}

export interface SalesActorContext {
  role: "owner" | "employee" | "super_admin";
  userId?: string;
  permissions: SalesActorPermissions;
}

export interface SaleItem {
  productLocalId: string;
  qty: number;
  unitPrice: number;
  unitCost?: number;
  taxAmount?: number;
  discountAmount?: number;
}

export interface SalePayment {
  method: "cash" | "card" | "transfer" | "mobile" | "mixed";
  currency: SalesCurrency;
  amount: number;
  reference?: string;
}

export interface Sale {
  localId: string;
  tenantId: string;
  saleNumber?: string;
  warehouseLocalId: string;
  cashierUserId?: string;
  status: "draft" | "completed" | "voided" | "refunded";
  currency: SalesCurrency;
  exchangeRate: number;
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  total: number;
  totalPaid: number;
  changeAmount: number;
  items: SaleItem[];
  payments: SalePayment[];
  suspendedSourceLocalId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface SuspendedSale {
  localId: string;
  tenantId: string;
  warehouseLocalId: string;
  cashierUserId?: string;
  status: "open" | "resumed" | "cancelled" | "converted";
  cart: SaleItem[];
  paymentsDraft: SalePayment[];
  notes?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface BoxClosing {
  localId: string;
  tenantId: string;
  warehouseLocalId: string;
  openedBy?: string;
  closedBy?: string;
  status: "open" | "closed";
  openedAt: string;
  closedAt?: string;
  openingAmount: number;
  expectedAmount?: number;
  countedAmount?: number;
  differenceAmount?: number;
  salesCount?: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CreateSuspendedSaleInput {
  warehouseLocalId: string;
  cart: SaleItem[];
  paymentsDraft?: SalePayment[];
  notes?: string;
  expiresAt?: string;
}

export interface CreatePosSaleInput {
  saleNumber?: string;
  warehouseLocalId: string;
  currency: SalesCurrency;
  exchangeRate: number;
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  total: number;
  totalPaid?: number;
  changeAmount?: number;
  items: SaleItem[];
  payments: SalePayment[];
  notes?: string;
  suspendedSourceLocalId?: string;
}

export interface CloseBoxInput {
  warehouseLocalId: string;
  countedAmount: number;
  notes?: string;
}

export interface OpenBoxInput {
  warehouseLocalId: string;
  openingAmount: number;
  openedAt?: string;
  notes?: string;
}

export interface RestoreSuspendedSaleResult {
  sourceLocalId: string;
  warehouseLocalId: string;
  cart: SaleItem[];
  paymentsDraft: SalePayment[];
  notes?: string;
}

export interface SalesUiState {
  isLoading: boolean;
  sales: Sale[];
  suspendedSales: SuspendedSale[];
  boxClosings: BoxClosing[];
  lastError: AppError | null;
}
