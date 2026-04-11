import type { ReportsKpis } from "../types/reports.types";
import { Tooltip } from "@/common";
import { DollarSign, TrendingUp, Package, AlertTriangle } from "lucide-react";

interface ReportsKpiHeaderProps {
  kpis: ReportsKpis | null;
  isLoading?: boolean;
}

export function ReportsKpiHeader({ kpis, isLoading }: ReportsKpiHeaderProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="stat-card animate-pulse">
            <div className="h-8 bg-surface-200 rounded w-24 mb-2" />
            <div className="h-4 bg-surface-200 rounded w-32" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Tooltip content="Total de ventas realizadas en el mes actual" position="top">
        <div className="stat-card cursor-help hover:bg-surface-50 transition-colors">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-state-info/10">
              <DollarSign className="w-5 h-5 text-state-info" />
            </div>
            <span className="text-xs font-medium text-content-tertiary uppercase tracking-wider">
              Venta Total Mes
            </span>
          </div>
          <div className="stat-value text-state-info">
            {kpis?.totalSalesMonth != null 
              ? kpis.totalSalesMonth.toLocaleString("es-VE", {
                  style: "currency",
                  currency: "VES",
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })
              : "—"
            }
          </div>
        </div>
      </Tooltip>

      <Tooltip content="Ganancia estimada basada en el costo de inventario vs precio de venta" position="top">
        <div className="stat-card cursor-help hover:bg-surface-50 transition-colors">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-state-success/10">
              <TrendingUp className="w-5 h-5 text-state-success" />
            </div>
            <span className="text-xs font-medium text-content-tertiary uppercase tracking-wider">
              Utilidad Estimada
            </span>
          </div>
          <div className="stat-value text-state-success">
            {kpis?.estimatedProfit != null
              ? kpis.estimatedProfit.toLocaleString("es-VE", {
                  style: "currency",
                  currency: "VES",
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })
              : "—"
            }
          </div>
        </div>
      </Tooltip>

      <Tooltip content="Valor total del inventario en Bolivares según costos registrados" position="top">
        <div className="stat-card cursor-help hover:bg-surface-50 transition-colors">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-brand-500/10">
              <Package className="w-5 h-5 text-brand-600" />
            </div>
            <span className="text-xs font-medium text-content-tertiary uppercase tracking-wider">
              Valorización Inventario
            </span>
          </div>
          <div className="stat-value text-brand-600">
            {kpis?.inventoryValue != null
              ? kpis.inventoryValue.toLocaleString("es-VE", {
                  style: "currency",
                  currency: "VES",
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })
              : "—"
            }
          </div>
        </div>
      </Tooltip>

      <Tooltip content="Eventos de auditoría que requieren revisión (movimientos anómalos, ajustes de inventario)" position="top">
        <div className="stat-card cursor-help hover:bg-surface-50 transition-colors">
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${kpis?.auditAlerts && kpis.auditAlerts > 0 ? 'bg-state-error/10' : 'bg-surface-100'}`}>
              <AlertTriangle className={`w-5 h-5 ${kpis?.auditAlerts && kpis.auditAlerts > 0 ? 'text-state-error' : 'text-content-tertiary'}`} />
            </div>
            <span className="text-xs font-medium text-content-tertiary uppercase tracking-wider">
              Alertas Auditoría
            </span>
          </div>
          <div className={`stat-value ${kpis?.auditAlerts && kpis.auditAlerts > 0 ? 'text-state-error' : 'text-content-secondary'}`}>
            {kpis?.auditAlerts ?? "—"}
          </div>
        </div>
      </Tooltip>
    </div>
  );
}
