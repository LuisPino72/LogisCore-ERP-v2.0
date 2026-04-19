import { DollarSign, Box, Scale, Pause, RefreshCw } from "lucide-react";
import { StatCard } from "@/common/components/StatCard";
import { Button } from "@/common/components/Button";
import { Tooltip } from "@/common";
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
      variant: "default" as const,
      tooltip: "Total de ventas completadas hoy en Bolivares"
    },
    { 
      label: "Estado de Caja", 
      value: isBoxOpen ? "Abierta" : "Cerrada", 
      icon: Box,
      variant: isBoxOpen ? "success" as const : "error" as const,
      pulse: isBoxOpen,
      tooltip: isBoxOpen ? "La caja está abierta para procesar ventas" : "La caja está cerrada. Abre una nueva caja para vender"
    },
    { 
      label: "Tasa USD/VES", 
      value: `${exchangeRate.toFixed(2)} Bs`, 
      icon: Scale,
      variant: "brand" as const,
      action: "refresh" as const,
      tooltip: "Tipo de cambio oficial para precios en Bolivares"
    },
    { 
      label: "Suspendidas", 
      value: openSuspendedCount.toString(), 
      icon: Pause,
      variant: openSuspendedCount > 0 ? "warning" as const : "default" as const,
      tooltip: "Ventas guardadas temporalmente que puedes retomar después"
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {kpis.map((kpi) => (
        <Tooltip key={kpi.label} content={kpi.tooltip} position="top">
          <div className="cursor-help">
            <StatCard 
              label={kpi.label}
              value={kpi.value}
              icon={<kpi.icon className="w-5 h-5 text-brand-600" />}
              className="hover:bg-surface-50 transition-colors"
            />
            {kpi.label === "Tasa USD/VES" && (
              <Button
                onClick={onRefreshRate}
                disabled={isLoadingRate}
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 p-1"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingRate ? "animate-spin" : ""}`} />
              </Button>
            )}
          </div>
        </Tooltip>
      ))}
    </div>
  );
}
