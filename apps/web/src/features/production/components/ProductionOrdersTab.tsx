import { useMemo } from "react";
import type { ProductionOrder, Recipe } from "../types/production.types";
import { DataTable } from "@/common/components/DataTable";
import { Badge } from "@/common/components/Badge";
import { EmptyState, LoadingSpinner } from "@/common/components/EmptyState";
import { Package, Play, CheckCircle, XCircle, Clock } from "lucide-react";

interface ProductionOrdersTabProps {
  orders: ProductionOrder[];
  recipes: Recipe[];
  warehouses: { localId: string; name: string }[];
  isLoading: boolean;
  onStartOrder: (orderLocalId: string) => void;
  onCompleteOrder: (order: ProductionOrder) => void;
  onCreateOrder: () => void;
  isSubmitting: boolean;
}

const statusConfig = {
  draft: { variant: "default" as const, label: "Borrador", icon: Clock },
  in_progress: { variant: "info" as const, label: "En Progreso", icon: Play },
  completed: { variant: "success" as const, label: "Completada", icon: CheckCircle },
  cancelled: { variant: "error" as const, label: "Cancelada", icon: XCircle },
};

export function ProductionOrdersTab({
  orders,
  recipes,
  warehouses,
  isLoading,
  onStartOrder,
  onCompleteOrder,
  onCreateOrder,
  isSubmitting,
}: ProductionOrdersTabProps) {
  const getRecipeName = (localId: string) => {
    return recipes.find((r) => r.localId === localId)?.name || localId.slice(0, 8);
  };

  const getWarehouseName = (localId: string) => {
    return warehouses.find((w) => w.localId === localId)?.name || localId.slice(0, 8);
  };

  const columns = useMemo(() => [
    {
      key: "localId",
      header: "Orden",
      render: (_: unknown, row: ProductionOrder) => (
        <div className="font-mono text-sm text-content-secondary">
          {row.localId.slice(0, 8)}
        </div>
      ),
    },
    {
      key: "recipeLocalId",
      header: "Receta",
      render: (_: unknown, row: ProductionOrder) => (
        <span className="font-medium">{getRecipeName(row.recipeLocalId)}</span>
      ),
    },
    {
      key: "warehouseLocalId",
      header: "Bodega",
      render: (_: unknown, row: ProductionOrder) => (
        <span className="text-content-secondary">{getWarehouseName(row.warehouseLocalId)}</span>
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
      render: (value: unknown, row: ProductionOrder) => (
        <span className="font-mono text-sm">
          {row.status === "completed" || row.status === "in_progress"
            ? Number(value ?? row.plannedQty).toFixed(4)
            : "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Estado",
      align: "center",
      render: (value: unknown) => {
        const config = statusConfig[value as keyof typeof statusConfig];
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
      key: "actions",
      header: "Acciones",
      align: "center",
      render: (_: unknown, row: ProductionOrder) => {
        if (row.status === "draft") {
          return (
            <button
              onClick={() => onStartOrder(row.localId)}
              disabled={isSubmitting}
              className="btn btn-secondary text-xs py-1 px-2"
            >
              <Play className="w-3 h-3" />
              Iniciar
            </button>
          );
        }
        if (row.status === "in_progress") {
          return (
            <button
              onClick={() => onCompleteOrder(row)}
              disabled={isSubmitting}
              className="btn btn-primary text-xs py-1 px-2"
            >
              <CheckCircle className="w-3 h-3" />
              Finalizar
            </button>
          );
        }
        return <span className="text-content-tertiary">—</span>;
      },
    },
  ] as const, [recipes, warehouses, isSubmitting, onStartOrder, onCompleteOrder]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-content-primary">Órdenes de Producción</h3>
        <button onClick={onCreateOrder} className="btn btn-primary">
          <Package className="w-4 h-4" />
          Nueva Orden
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner message="Cargando órdenes..." />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<Package className="w-12 h-12 text-content-tertiary" />}
          title="No hay órdenes"
          description="Crea tu primera orden de producción para comenzar."
          action={
            <button onClick={onCreateOrder} className="btn btn-primary">
              <Package className="w-4 h-4" />
              Crear Orden
            </button>
          }
        />
      ) : (
        <DataTable columns={columns as never} data={orders} emptyMessage="No hay órdenes disponibles" />
      )}
    </div>
  );
}
