import type { AppError } from "@logiscore/core";

export interface SalesByDay {
  saleDate: string;
  totalTransactions: number;
  totalSubtotal: number;
  totalTax: number;
  totalDiscount: number;
  totalSales: number;
  totalCollected: number;
  voidedCount: number;
  refundedCount: number;
}

export interface SalesByProduct {
  productLocalId: string;
  totalLineItems: number;
  totalQty: number;
  totalAmount: number;
}

export interface KardexEntry {
  productLocalId: string;
  warehouseLocalId: string;
  warehouseName: string;
  productName: string;
  totalIn: number;
  totalOut: number;
  currentBalance: number;
}

export interface GrossProfit {
  saleLocalId: string;
  createdAt: string;
  subtotal: number;
  taxTotal: number;
  saleTotal: number;
  totalCost: number;
  grossProfit: number;
  profitMarginPercent: number;
}

export interface BoxClosingSummary {
  localId: string;
  warehouseLocalId: string;
  warehouseName: string;
  openedAt: string;
  closedAt: string;
  openingAmount: number;
  expectedAmount: number;
  countedAmount: number;
  differenceAmount: number;
  salesCount: number;
  status: "open" | "closed";
  closedBy?: string;
}

export interface SecurityAuditLog {
  localId: string;
  tenantId: string;
  userId?: string;
  eventType: string;
  targetTable?: string;
  targetLocalId?: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  details?: Record<string, unknown>;
  createdAt: string;
}

export interface ReportsTenantContext {
  tenantSlug: string;
}

export interface ReportsActorContext {
  role: "owner" | "employee" | "super_admin";
  userId?: string;
  permissions: {
    canViewReports: boolean;
    canExportReports: boolean;
  };
}

export interface ReportsUiState {
  isLoading: boolean;
  isSubmitting: boolean;
  salesByDay: SalesByDay[];
  salesByProduct: SalesByProduct[];
  kardex: KardexEntry[];
  grossProfit: GrossProfit[];
  boxClosings: BoxClosingSummary[];
  auditLogs: SecurityAuditLog[];
  lastError: AppError | null;
}