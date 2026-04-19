import { ok, type AppError, type EventBus, type Result } from "@logiscore/core";
import { format, subDays, startOfDay, isSameDay, parseISO, subDays as addDays } from "date-fns";
import type { 
  DashboardData, 
  DashboardStats, 
  LowStockProduct,
  MetricTrend,
  RecentActivityEntry, 
  SalesTrendPoint, 
  TopProductMetric,
  CashStatus
} from "../types/dashboard.types";
import type { SalesService } from "@/features/sales/services/sales.service";
import type { SalesTenantContext, Sale } from "@/features/sales/types/sales.types";
import type { InventoryService } from "@/features/inventory/services/inventory.service";
import type { InventoryTenantContext, InventoryActorContext, ReorderSuggestion } from "@/features/inventory/types/inventory.types";
import type { ProductsService } from "@/features/products/services/products.service";
import type { ProductsTenantContext, Product } from "@/features/products/types/products.types";

export interface DashboardServiceDependencies {
  sales: SalesService;
  inventory: InventoryService;
  products: ProductsService;
  exchangeRates?: {
    getActiveRate: (tenantId: string, fromCurrency: string, toCurrency: string) => Promise<Result<{ rate: number } | null, AppError>>;
  };
  eventBus: EventBus;
  clock?: () => Date;
}

export const createDashboardService = ({
  sales,
  inventory,
  products,
  exchangeRates,
  eventBus,
  clock = () => new Date()
}: DashboardServiceDependencies) => {
  
  let lastFetchTime: number | null = null;
  let cachedData: DashboardData | null = null;
  const CACHE_TTL = 60 * 1000;

  const calculateTrend = (current: number, previous: number): MetricTrend | undefined => {
    if (previous <= 0) return undefined;
    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(Math.round(change * 10) / 10),
      isUp: change >= 0
    };
  };

  const getDashboardData = async (
    tenant: SalesTenantContext & InventoryTenantContext & ProductsTenantContext,
    actor: InventoryActorContext
  ): Promise<Result<DashboardData, AppError>> => {
    const now_ts = clock().getTime();
    if (cachedData && lastFetchTime && (now_ts - lastFetchTime < CACHE_TTL)) {
      return ok(cachedData);
    }

    const [salesResult, movementsResult, reorderResult, productsResult, boxResult] = await Promise.all([
      sales.listSales(tenant),
      inventory.listStockMovements(tenant),
      inventory.getReorderSuggestions(tenant, actor),
      products.listProducts(tenant),
      sales.listBoxClosings(tenant)
    ]);

    if (!salesResult.ok) return salesResult;
    if (!movementsResult.ok) return movementsResult;
    if (!reorderResult.ok) return reorderResult;
    if (!productsResult.ok) return productsResult;
    if (!boxResult.ok) return boxResult;

    const allSales: Sale[] = salesResult.data;
    const allProducts: Product[] = productsResult.data;
    const reorderSuggestions: ReorderSuggestion[] = reorderResult.data;
    const boxClosings = boxResult.data;
    const productNames = new Map<string, string>(allProducts.map(p => [p.localId, p.name]));
    const warehouses = new Map<string, string>();
    
    const warehousesResult = await inventory.listWarehouses(tenant);
    if (warehousesResult.ok) {
      warehousesResult.data.forEach(w => warehouses.set(w.localId, w.name));
    }

    const now = clock();
    const today = startOfDay(now);
    const yesterday = startOfDay(addDays(now, -1));

    // Filtra ventas por estado y fecha
    const todaySalesList = allSales.filter(s => s.status === "completed" && isSameDay(parseISO(s.createdAt), today));
    const yesterdaySalesList = allSales.filter(s => s.status === "completed" && isSameDay(parseISO(s.createdAt), yesterday));

    const todaySalesAmount = todaySalesList.reduce((acc, s) => acc + s.total, 0);
    const yesterdaySalesAmount = yesterdaySalesList.reduce((acc, s) => acc + s.total, 0);
    const todayOrdersCount = todaySalesList.length;
    const yesterdayOrdersCount = yesterdaySalesList.length;
    const avgTicket = todayOrdersCount > 0 ? todaySalesAmount / todayOrdersCount : 0;
    const yesterdayAvgTicket = yesterdayOrdersCount > 0 ? yesterdaySalesAmount / yesterdayOrdersCount : 0;
    const lowStockCount = reorderSuggestions.length;

    // Tendencias
    const salesTrend = calculateTrend(todaySalesAmount, yesterdaySalesAmount);
    const ordersTrend = calculateTrend(todayOrdersCount, yesterdayOrdersCount);
    const ticketTrend = calculateTrend(avgTicket, yesterdayAvgTicket);

    const stats: DashboardStats = {
      todaySales: todaySalesAmount,
      todayOrders: todayOrdersCount,
      lowStockCount,
      averageTicketValue: avgTicket,
      salesTrend,
      ordersTrend,
      ticketTrend
    };

    // Tendencia de ventas
    const salesTrendData: SalesTrendPoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = subDays(today, i);
      const daySales = allSales.filter(s => s.status === "completed" && isSameDay(parseISO(s.createdAt), day));
      salesTrendData.push({
        date: format(day, "dd/MM"),
        amount: daySales.reduce((acc, s) => acc + s.total, 0),
        orders: daySales.length
      });
    }

    // Productos más vendidos
    const productMap = new Map<string, { qty: number, total: number }>();
    allSales
      .filter(s => s.status === "completed")
      .forEach(sale => {
        sale.items.forEach(item => {
          const current = productMap.get(item.productLocalId) || { qty: 0, total: 0 };
          productMap.set(item.productLocalId, {
            qty: current.qty + item.qty,
            total: current.total + (item.qty * item.unitPrice)
          });
        });
      });

    const topProducts: TopProductMetric[] = Array.from(productMap.entries())
      .map(([id, metrics]) => ({
        name: productNames.get(id) || `Producto #${id.slice(0, 4)}`,
        qty: metrics.qty,
        total: metrics.total
      }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    // Actividades recientes
    const recentActivities: RecentActivityEntry[] = allSales
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5)
      .map(s => ({
        id: s.localId,
        type: "sale" as const,
        title: `Venta #${s.saleNumber?.slice(-4) || s.localId.slice(0, 4)}`,
        description: `Completada por ${s.cashierUserId?.slice(0, 8) || "Sistema"}`,
        timestamp: s.createdAt,
        amount: s.total
      }));

    // Productos con stock bajo
    const lowStockProducts: LowStockProduct[] = reorderSuggestions
      .slice(0, 3)
      .map(s => ({
        localId: s.productLocalId,
        name: productNames.get(s.productLocalId) || `Producto #${s.productLocalId.slice(0, 4)}`,
        currentStock: s.currentStock,
        minStock: s.minStock,
        warehouseName: warehouses.get(s.warehouseLocalId) || "Bodega Principal"
      }));

    // Tasa de cambio
    let exchangeRate: number | null = null;
    if (exchangeRates) {
      const rateResult = await exchangeRates.getActiveRate(tenant.tenantSlug, "USD", "VES");
      if (rateResult.ok && rateResult.data) {
        exchangeRate = rateResult.data.rate;
      }
    }

    // Estado de caja
    const openBox = boxClosings?.find(b => b.status === "open" && !b.deletedAt);
    const cashStatus: CashStatus = openBox ? "open" : "closed";

    const data: DashboardData = {
      stats,
      salesTrend: salesTrendData,
      topProducts,
      recentActivities,
      lowStockProducts,
      exchangeRate,
      cashStatus
    };

    cachedData = data;
    lastFetchTime = now_ts;

    eventBus.emit("DASHBOARD.READY", data);
    return ok(data);
  };

  const invalidateCache = () => {
    lastFetchTime = null;
    cachedData = null;
  };

  return { getDashboardData, invalidateCache };
};

export type DashboardService = ReturnType<typeof createDashboardService>;
