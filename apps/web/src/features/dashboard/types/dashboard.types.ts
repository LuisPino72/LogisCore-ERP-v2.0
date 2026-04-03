import type { AppError } from "@logiscore/core";

/**
 * Estadísticas principales del dashboard
 */
export interface DashboardStats {
  todaySales: number;
  todayOrders: number;
  lowStockCount: number;
  averageTicketValue: number;
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
}

/**
 * Estado de la UI del dashboard
 */
export interface DashboardUiState {
  isLoading: boolean;
  data: DashboardData | null;
  lastError: AppError | null;
}
