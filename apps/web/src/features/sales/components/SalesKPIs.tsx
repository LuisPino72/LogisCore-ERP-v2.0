import { DollarSign, Box, Scale, Pause, RefreshCw } from "lucide-react";
import { Sale, BoxClosing, SuspendedSale } from "../types/sales.types";

interface SalesKPIsProps {
  sales: Sale[];
  boxClosings: BoxClosing[];
  suspendedSales: SuspendedSale[];
  exchangeRate: number;
  warehouseLocalId: string;
  onRefreshRate: () => void;
  isLoadingRate?: boolean;
}

export function SalesKPIs({
  sales,
  boxClosings,
  suspendedSales,
  exchangeRate,
  warehouseLocalId,
  onRefreshRate,
  isLoadingRate = false
}: SalesKPIsProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todaySalesTotal = sales
    .filter(s => {
      const saleDate = new Date(s.createdAt);
      saleDate.setHours(0, 0, 0, 0);
      return saleDate.getTime() === today.getTime() && s.status === "completed";
    })
    .reduce((sum, s) => sum + s.total, 0);

  const openBox = boxClosings.find(
    b => b.status === "open" && b.warehouseLocalId === warehouseLocalId && !b.deletedAt
  );
  const isBoxOpen = !!openBox;

  const openSuspendedCount = suspendedSales.filter(
    s => s.status === "open" || s.status === "resumed"
  ).length;

  const kpis = [
    { 
      label: "Venta del Día", 
      value: `$${todaySalesTotal.toFixed(2)}`, 
      icon: DollarSign,
      variant: "default" as const
    },
    { 
      label: "Estado de Caja", 
      value: isBoxOpen ? "Abierta" : "Cerrada", 
      icon: Box,
      variant: isBoxOpen ? "success" as const : "error" as const,
      pulse: isBoxOpen
    },
    { 
      label: "Tasa USD/VES", 
      value: `${exchangeRate.toFixed(2)} Bs`, 
      icon: Scale,
      variant: "brand" as const,
      action: "refresh" as const
    },
    { 
      label: "Suspendidas", 
      value: openSuspendedCount.toString(), 
      icon: Pause,
      variant: openSuspendedCount > 0 ? "warning" as const : "default" as const
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-content-tertiary">
              <kpi.icon className="w-4 h-4" />
            </span>
            {kpi.pulse && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-state-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-state-success"></span>
              </span>
            )}
          </div>
          <div className="stat-value">{kpi.value}</div>
          <div className="stat-label flex items-center gap-1">
            {kpi.label}
            {kpi.action === "refresh" && (
              <button
                onClick={onRefreshRate}
                disabled={isLoadingRate}
                className="ml-1 p-1 rounded hover:bg-surface-100 transition-colors"
                title="Actualizar tasa"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingRate ? "animate-spin" : ""}`} />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
