import { useEffect } from "react";
import { useDashboard } from "../hooks/useDashboard";
import { StatCard } from "./StatCard";
import { SalesTrendChart } from "./SalesTrendChart";
import { TopProductsChart } from "./TopProductsChart";
import { RecentActivityList } from "./RecentActivityList";
import type { SalesTenantContext } from "@/features/sales/types/sales.types";
import type { InventoryTenantContext, InventoryActorContext } from "@/features/inventory/types/inventory.types";
import type { ProductsTenantContext } from "@/features/products/types/products.types";

interface DashboardPanelProps {
  tenant: SalesTenantContext & InventoryTenantContext & ProductsTenantContext;
  actor: InventoryActorContext;
  currencySymbol?: string;
}

export function DashboardPanel({ tenant, actor, currencySymbol = "$" }: DashboardPanelProps) {
  const { state, loadData } = useDashboard();

  useEffect(() => {
    loadData(tenant, actor);
  }, [loadData, tenant, actor]);

  if (state.isLoading && !state.data) {
    return (
      <div className="flex h-96 w-full items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (state.lastError) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600 font-medium">Error al cargar el dashboard: {state.lastError.message}</p>
        <button 
          onClick={() => loadData(tenant, actor)}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!state.data) return null;

  const { stats, salesTrend, topProducts, recentActivities } = state.data;

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Panel de Control
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Resumen operativo de hoy y rendimiento reciente.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Ventas de hoy" 
          value={`${currencySymbol} ${stats.todaySales.toLocaleString()}`} 
          icon={<span>💰</span>}
          color="green"
        />
        <StatCard 
          title="Pedidos realizados" 
          value={stats.todayOrders} 
          icon={<span>🧾</span>}
          color="blue"
        />
        <StatCard 
          title="Stock Crítico" 
          value={stats.lowStockCount} 
          icon={<span>⚠️</span>}
          color="red"
        />
        <StatCard 
          title="Ticket Promedio" 
          value={`${currencySymbol} ${stats.averageTicketValue.toFixed(2)}`} 
          icon={<span>📈</span>}
          color="purple"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SalesTrendChart data={salesTrend} currencySymbol={currencySymbol} />
        <TopProductsChart data={topProducts} />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
           <RecentActivityList activities={recentActivities} currencySymbol={currencySymbol} />
        </div>
        
        {/* Simplified Quick Actions Placeholder for future use */}
        <div className="bg-linear-to-br from-blue-600 to-blue-700 p-6 rounded-2xl text-white shadow-lg flex flex-col justify-between overflow-hidden relative">
          <div className="relative z-10">
            <h3 className="text-lg font-bold mb-2">LogisCore Pro</h3>
            <p className="text-blue-100 text-sm mb-6">Optimiza tu operación con vistas avanzadas y reportes en tiempo real.</p>
            <div className="space-y-3">
              <button className="w-full py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl text-sm font-semibold transition-all">
                Abrir Punto de Venta
              </button>
              <button className="w-full py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl text-sm font-semibold transition-all">
                Ver Inventario
              </button>
            </div>
          </div>
          <div className="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        </div>
      </div>
    </div>
  );
}
