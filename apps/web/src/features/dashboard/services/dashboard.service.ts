import { ok, type AppError, type EventBus, type Result } from "@logiscore/core";
import { format, subDays, startOfDay, isSameDay, parseISO } from "date-fns";
import type { 
  DashboardData, 
  DashboardStats, 
  RecentActivityEntry, 
  SalesTrendPoint, 
  TopProductMetric 
} from "../types/dashboard.types";
import type { SalesService } from "@/features/sales/services/sales.service";
import type { SalesTenantContext, Sale } from "@/features/sales/types/sales.types";
import type { InventoryService } from "@/features/inventory/services/inventory.service";
import type { InventoryTenantContext, InventoryActorContext } from "@/features/inventory/types/inventory.types";
import type { ProductsService } from "@/features/products/services/products.service";
import type { ProductsTenantContext, Product } from "@/features/products/types/products.types";

export interface DashboardServiceDependencies {
  sales: SalesService;
  inventory: InventoryService;
  products: ProductsService;
  eventBus: EventBus;
  clock?: () => Date;
}

export const createDashboardService = ({
  sales,
  inventory,
  products,
  eventBus,
  clock = () => new Date()
}: DashboardServiceDependencies) => {
  
  // Simple cache for dashboard data
  let lastFetchTime: number | null = null;
  let cachedData: DashboardData | null = null;
  const CACHE_TTL = 60 * 1000; // 1 minute
  
  const getDashboardData = async (
    tenant: SalesTenantContext & InventoryTenantContext & ProductsTenantContext,
    actor: InventoryActorContext
  ): Promise<Result<DashboardData, AppError>> => {
    
    // Check cache
    const now_ts = clock().getTime();
    if (cachedData && lastFetchTime && (now_ts - lastFetchTime < CACHE_TTL)) {
      return ok(cachedData);
    }

    // Fetch base data
    const [salesResult, movementsResult, reorderResult, productsResult] = await Promise.all([
      sales.listSales(tenant),
      inventory.listStockMovements(tenant),
      inventory.getReorderSuggestions(tenant, actor),
      products.listProducts(tenant)
    ]);

    if (!salesResult.ok) return salesResult;
    if (!movementsResult.ok) return movementsResult;
    if (!reorderResult.ok) return reorderResult;
    if (!productsResult.ok) return productsResult;

    const allSales: Sale[] = salesResult.data;
    const allProducts: Product[] = productsResult.data;
    const productNames = new Map<string, string>(allProducts.map(p => [p.localId, p.name]));
    const now = clock();
    const today = startOfDay(now);

    // 1. Calculate Stats
    const todaySalesList = allSales.filter(s => s.status === "completed" && isSameDay(parseISO(s.createdAt), today));
    const todaySalesAmount = todaySalesList.reduce((acc, s) => acc + s.total, 0);
    const todayOrdersCount = todaySalesList.length;
    const avgTicket = todayOrdersCount > 0 ? todaySalesAmount / todayOrdersCount : 0;
    const lowStockCount = reorderResult.data.length;

    const stats: DashboardStats = {
      todaySales: todaySalesAmount,
      todayOrders: todayOrdersCount,
      lowStockCount,
      averageTicketValue: avgTicket
    };

    // 2. Sales Trend (Last 7 days)
    const salesTrend: SalesTrendPoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = subDays(today, i);
      const daySales = allSales.filter(s => s.status === "completed" && isSameDay(parseISO(s.createdAt), day));
      salesTrend.push({
        date: format(day, "dd/MM"),
        amount: daySales.reduce((acc, s) => acc + s.total, 0),
        orders: daySales.length
      });
    }

    // 3. Top Products (By Quantity or Amount? Let's do Quantity)
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

    // 4. Recent Activities
    const recentActivities: RecentActivityEntry[] = allSales
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5)
      .map(s => ({
        id: s.localId,
        type: "sale" as const,
        title: `Venta #${s.saleNumber.slice(-4) || s.localId.slice(0, 4)}`,
        description: `Completada por ${s.cashierUserId.slice(0, 8)}`,
        timestamp: s.createdAt,
        amount: s.total
      }));

    const data: DashboardData = {
      stats,
      salesTrend,
      topProducts,
      recentActivities
    };

    // Update cache
    cachedData = data;
    lastFetchTime = now_ts;

    eventBus.emit("DASHBOARD.READY", data);
    return ok(data);
  };

  return { getDashboardData };
};

export type DashboardService = ReturnType<typeof createDashboardService>;
