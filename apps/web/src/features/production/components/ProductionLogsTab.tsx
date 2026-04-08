import { useMemo } from "react";
import type { ProductionLog, Recipe } from "../types/production.types";
import type { Product } from "@/features/products/types/products.types";
import { DataTable } from "@/common/components/DataTable";
import { Badge } from "@/common/components/Badge";
import { EmptyState, LoadingSpinner } from "@/common/components/EmptyState";
import { History, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface ProductionLogsTabProps {
  logs: ProductionLog[];
  recipes: Recipe[];
  products: Product[];
  isLoading: boolean;
}

export function ProductionLogsTab({
  logs,
  recipes,
  products,
  isLoading,
}: ProductionLogsTabProps) {
  const getRecipeName = (localId: string) => {
    return recipes.find((r) => r.localId === localId)?.name || localId.slice(0, 8);
  };

  const getProductName = (localId: string) => {
    return products.find((p) => p.localId === localId)?.name || localId.slice(0, 8);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-VE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getVarianceConfig = (variance: number) => {
    if (variance > 5) {
      return { variant: "error" as const, icon: TrendingUp, label: `+${variance.toFixed(2)}%` };
    }
    if (variance > 0) {
      return { variant: "warning" as const, icon: TrendingUp, label: `+${variance.toFixed(2)}%` };
    }
    if (variance < -5) {
      return { variant: "error" as const, icon: TrendingDown, label: `${variance.toFixed(2)}%` };
    }
    if (variance < 0) {
      return { variant: "success" as const, icon: TrendingDown, label: `${variance.toFixed(2)}%` };
    }
    return { variant: "success" as const, icon: Minus, label: "0%" };
  };

  const columns = useMemo(() => [
    {
      key: "createdAt",
      header: "Fecha",
      render: (value: unknown) => (
        <span className="text-sm text-content-secondary">
          {formatDate(value as string)}
        </span>
      ),
    },
    {
      key: "productionOrderLocalId",
      header: "Orden",
      render: (_: unknown, row: ProductionLog) => (
        <span className="font-mono text-sm">{row.productionOrderLocalId.slice(0, 8)}</span>
      ),
    },
    {
      key: "recipeLocalId",
      header: "Receta",
      render: (_: unknown, row: ProductionLog) => (
        <span className="font-medium">{getRecipeName(row.recipeLocalId)}</span>
      ),
    },
    {
      key: "plannedQty",
      header: "Planificado",
      align: "right",
      render: (value: unknown) => (
        <span className="font-mono text-sm">{Number(value).toFixed(4)}</span>
      ),
    },
    {
      key: "producedQty",
      header: "Producido",
      align: "right",
      render: (value: unknown) => (
        <span className="font-mono text-sm font-medium">{Number(value).toFixed(4)}</span>
      ),
    },
    {
      key: "variancePercent",
      header: "Varianza",
      align: "center",
      render: (value: unknown) => {
        const config = getVarianceConfig(value as number);
        const Icon = config.icon;
        return (
          <Badge variant={config.variant}>
            <Icon className="w-3 h-3 mr-1" />
            {config.label}
          </Badge>
        );
      },
    },
    {
      key: "ingredientsUsed",
      header: "Ingredientes",
      align: "center",
      render: (_: unknown, row: ProductionLog) => (
        <div className="group relative inline-block">
          <span className="text-sm text-content-secondary cursor-pointer hover:text-content-primary">
            {row.ingredientsUsed.length} items
          </span>
          <div className="hidden group-hover:block absolute z-10 bg-surface-900 text-surface-50 text-xs rounded-lg p-3 -top-full left-1/2 -translate-x-1/2 mb-2 min-w-[200px]">
            <div className="font-medium mb-1">Ingredientes usados:</div>
            {row.ingredientsUsed.map((ing, idx) => (
              <div key={idx} className="flex justify-between gap-2">
                <span>{getProductName(ing.productLocalId)}</span>
                <span className="font-mono">{ing.requiredQty.toFixed(4)}</span>
              </div>
            ))}
          </div>
        </div>
      ),
    },
  ] as const, [recipes, products, getRecipeName, getProductName]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-content-primary">Historial de Producción</h3>
        <Badge variant="info">
          <History className="w-3 h-3 mr-1" />
          {logs.length} registros
        </Badge>
      </div>

      {isLoading ? (
        <LoadingSpinner message="Cargando historial..." />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={<History className="w-12 h-12 text-content-tertiary" />}
          title="No hay registros"
          description="El historial de producción aparecerá aquí cuando completes órdenes."
        />
      ) : (
        <DataTable columns={columns as never} data={logs} emptyMessage="No hay registros disponibles" />
      )}
    </div>
  );
}
