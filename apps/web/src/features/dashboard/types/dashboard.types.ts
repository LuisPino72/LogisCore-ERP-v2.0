import type { AppError } from "@logiscore/core";

/**
 * Tendencia de una métrica (comparación vs período anterior)
 */
export interface MetricTrend {
  value: number;
  isUp: boolean;
}

/**
 * Estadísticas principales del dashboard
 */
export interface DashboardStats {
  todaySales: number;
  todayOrders: number;
  lowStockCount: number;
  averageTicketValue: number;
  salesTrend: MetricTrend | undefined;
  ordersTrend: MetricTrend | undefined;
  ticketTrend: MetricTrend | undefined;
}

/**
 * Datos para la gráfica de tendencia de ventas (últimos 7 días)
 */
export interface SalesTrendPoint {
  date: string; // "DD-MM"
  amount: number;
  orders: number;
}

/**
 * Datos para el Top 5 de productos más vendidos
 */
export interface TopProductMetric {
  name: string;
  qty: number;
  total: number;
}

/**
 * Registro de actividad reciente
 */
export interface RecentActivityEntry {
  id: string;
  type: "sale" | "inventory" | "system";
  title: string;
  description: string;
  timestamp: string;
  amount?: number;
}

/**
 * Estado completo del dashboard consolidado
 */
export interface DashboardData {
  stats: DashboardStats;
  salesTrend: SalesTrendPoint[];
  topProducts: TopProductMetric[];
  recentActivities: RecentActivityEntry[];
  lowStockProducts: LowStockProduct[];
  exchangeRate: number | null;
  cashStatus: CashStatus;
}

/**
 * Producto con stock bajo (para mini-lista)
 */
export interface LowStockProduct {
  localId: string;
  name: string;
  currentStock: number;
  minStock: number;
  warehouseName: string;
}

/**
 * Estado de la caja
 */
export type CashStatus = "open" | "closed" | "unknown";

/**
 * Estado de la UI del dashboard
 */
export interface DashboardUiState {
  isLoading: boolean;
  data: DashboardData | null;
  lastError: AppError | null;
}
