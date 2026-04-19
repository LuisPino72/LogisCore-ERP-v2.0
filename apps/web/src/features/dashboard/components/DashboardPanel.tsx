import { useCallback, useEffect } from "react";
import { useDashboard } from "../hooks/useDashboard";
import { LoadingSpinner } from "@/common";
import { EmptyState } from "@/common";
import { Card } from "@/common/components/Card";
import { Alert } from "@/common/components/Alert";
import { Button } from "@/common/components/Button";
import { StatCard } from "./StatCard";
import { SalesTrendChart } from "./SalesTrendChart";
import { TopProductsChart } from "./TopProductsChart";
import { RecentActivityList } from "./RecentActivityList";
import { ExchangeRateBanner } from "./ExchangeRateBanner";
import { CashStatusIndicator } from "./CashStatusIndicator";
import { LowStockList } from "./LowStockList";
import { eventBus } from "@/lib/core/runtime";
import type { SalesTenantContext } from "@/features/sales/types/sales.types";
import type { InventoryTenantContext, InventoryActorContext } from "@/features/inventory/types/inventory.types";
import type { ProductsTenantContext } from "@/features/products/types/products.types";
import type { ModuleId } from "@/common/components/AppLayout";

interface DashboardPanelProps {
  tenant: SalesTenantContext & InventoryTenantContext & ProductsTenantContext;
  actor: InventoryActorContext;
  currencySymbol?: string;
  onNavigate?: ((module: ModuleId) => void) | undefined;
  onUpdateExchangeRate?: ((rate: number) => Promise<void>) | undefined;
  onFetchExchangeRates?: (() => Promise<void>) | undefined;
}

export function DashboardPanel({ 
  tenant, 
  actor, 
  currencySymbol = "$", 
  onNavigate, 
  onUpdateExchangeRate, 
  onFetchExchangeRates 
}: DashboardPanelProps) {
  const { state, loadData, invalidateCache } = useDashboard(tenant, actor);

  const handleRefresh = useCallback(() => {
    invalidateCache();
    loadData();
  }, [invalidateCache, loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const offSaleCompleted = eventBus.on("SALE.COMPLETED", handleRefresh);
    const offSaleSuspended = eventBus.on("SALE.SUSPENDED", handleRefresh);
    const offBoxOpened = eventBus.on("POS.BOX_OPENED", handleRefresh);
    const offBoxClosed = eventBus.on("POS.BOX_CLOSED", handleRefresh);
    const offInventoryUpdated = eventBus.on("INVENTORY.UPDATED", handleRefresh);
    const offDashboardRefresh = eventBus.on("DASHBOARD.REFRESH", handleRefresh);

    return () => {
      offSaleCompleted();
      offSaleSuspended();
      offBoxOpened();
      offBoxClosed();
      offInventoryUpdated();
      offDashboardRefresh();
    };
  }, [handleRefresh]);

  if (state.isLoading && !state.data) {
    return <LoadingSpinner variant="fullscreen" message="Cargando panel de control..." />;
  }

  if (state.lastError) {
    return (
      <div className="p-12 text-center max-w-lg mx-auto mt-10">
        <Card>
          <Alert variant="error" className="mb-6">
            <span>Error al cargar el dashboard: {state.lastError.message}</span>
          </Alert>
          <Button 
            onClick={() => loadData()}
            variant="primary"
          >
            Reintentar
          </Button>
        </Card>
      </div>
    );
  }

  if (!state.data) return null;

  const { stats, salesTrend, topProducts, recentActivities, lowStockProducts, exchangeRate, cashStatus } = state.data;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-content-primary tracking-tight">
            Panel de Control
          </h1>
          <p className="text-content-secondary">
            Resumen operativo de hoy y rendimiento reciente.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ExchangeRateBanner 
            rate={exchangeRate} 
            isLoading={state.isLoading}
            onUpdateRate={onUpdateExchangeRate}
            onFetchFromBCV={onFetchExchangeRates}
          />
          <CashStatusIndicator status={cashStatus} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Ventas de hoy" 
          value={`${currencySymbol} ${stats.todaySales.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="gold"
          trend={stats.salesTrend}
          tooltip="Ventas totales del día actual"
        />
        <StatCard 
          title="Pedidos" 
          value={stats.todayOrders} 
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
            </svg>
          }
          color="blue"
          trend={stats.ordersTrend}
          tooltip="Número de pedidos completados hoy"
        />
        <StatCard 
          title="Stock Crítico" 
          value={stats.lowStockCount} 
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          }
          color="red"
          tooltip="Productos con inventario bajo el mínimo"
        />
        <StatCard 
          title="Ticket Promedio" 
          value={`${currencySymbol} ${stats.averageTicketValue.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.308 4.308a4.5 4.5 0 016.708 0l4.377-4.377a4.5 4.5 0 016.708 6.708l-4.377 4.377a4.5 4.5 0 01-6.708 0l-4.308-4.308a4.5 4.5 0 010-6.708z" />
            </svg>
          }
          color="purple"
          trend={stats.ticketTrend}
          tooltip="Valor promedio por transacción"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SalesTrendChart data={salesTrend} currencySymbol={currencySymbol} />
        <TopProductsChart data={topProducts} />
      </div>

      {/* Stock Crítico Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border shadow-sm p-4">
            <h3 className="text-lg font-semibold text-content-primary mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              Stock Crítico
            </h3>
            <LowStockList products={lowStockProducts} />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2">
          {recentActivities.length > 0 ? (
            <RecentActivityList activities={recentActivities} currencySymbol={currencySymbol} />
          ) : (
            <EmptyState
              title="No hay actividad reciente"
              description="Las ventas realizadas aparecerán aquí"
            />
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-linear-to-br from-brand-600 to-brand-800 p-6 rounded-2xl text-white shadow-lg flex flex-col justify-between overflow-hidden relative">
        <div className="relative z-10">
          <h3 className="text-lg font-bold mb-2">LogisCore Pro</h3>
          <p className="text-brand-100 text-sm mb-6">Optimiza tu operación con vistas avanzadas y reportes en tiempo real.</p>
          <div className="grid grid-cols-2 gap-3">
            <button 
              className="w-full py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl text-sm font-semibold transition-all border border-white/20"
              onClick={() => onNavigate?.("sales")}
            >
              Abrir Punto de Venta
            </button>
            <button 
              className="w-full py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl text-sm font-semibold transition-all border border-white/20"
              onClick={() => onNavigate?.("inventory")}
            >
              Ver Inventario
            </button>
          </div>
        </div>
        <div className="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
      </div>
    </div>
  );
}
