/**
 * Tipos para el módulo de reportes.
 * Incluye interfaces para reportes de ventas, kardex, utilidad bruta, cierres de caja y auditoría.
 */

import type { AppError } from "@logiscore/core";

// Reporte de ventas agregadas por día
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
  role: "owner" | "employee" | "admin";
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

export interface ReportsKpis {
  totalSalesMonth: number;
  estimatedProfit: number;
  inventoryValue: number;
  auditAlerts: number;
}

export interface KardexEntryExtended extends KardexEntry {
  isWeighted: boolean;
  lastMovementDate: string;
  lastMovementType: string;
  costLayers: LotLayer[];
}

export interface LotLayer {
  layerId: string;
  productLocalId: string;
  warehouseLocalId: string;
  quantity: number;
  remainingQty: number;
  unitCost: number;
  totalCost: number;
  receivedAt: string;
  referenceType?: string;
  referenceLocalId?: string;
}

export interface FinanceReport {
  period: string;
  totalSales: number;
  totalCost: number;
  grossProfit: number;
  profitMarginPercent: number;
  ivaCollected: number;
  igtfCollected: number;
  exchangeRateUsed: number;
}

export interface SaleWithDetails {
  localId: string;
  saleDate: string;
  status: "completed" | "voided" | "refunded";
  subtotal: number;
  taxTotal: number;
  total: number;
  itemsCount: number;
  paymentMethod: string;
  exchangeRate: number;
  totalUsd: number;
}

export interface AuditLogWithUser extends SecurityAuditLog {
  userName?: string;
  userEmail?: string;
  severity: "low" | "medium" | "high" | "critical";
}

export interface ReportsFilters {
  dateRange?: { start: string; end: string };
  warehouseLocalId?: string;
  searchQuery?: string;
}