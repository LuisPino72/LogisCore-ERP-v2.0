import type { ProductionOrder, ProductionLog, Recipe } from "../types/production.types";

export interface ProductionKpis {
  activeOrders: number;
  valueInProcess: number;
  averageYield: number;
  totalRecipes: number;
}

interface KpiHeaderProps {
  orders: ProductionOrder[];
  logs: ProductionLog[];
  recipes: Recipe[];
}

export function KpiHeader({ orders, logs, recipes }: KpiHeaderProps) {
  const activeOrders = orders.filter(
    (o) => o.status === "draft" || o.status === "in_progress"
  ).length;

  const completedOrders = logs.slice(-10);
  const averageYield =
    completedOrders.length > 0
      ? completedOrders.reduce((sum, log) => sum + log.variancePercent, 0) /
        completedOrders.length
      : 0;

  const totalRecipes = recipes.filter((r) => !r.deletedAt).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="stat-card">
        <div className="stat-value text-state-info">{activeOrders}</div>
        <div className="stat-label">Órdenes Activas</div>
      </div>

      <div className="stat-card">
        <div className="stat-value text-state-warning">
          {averageYield.toFixed(1)}%
        </div>
        <div className="stat-label">Rendimiento Promedio</div>
      </div>

      <div className="stat-card">
        <div className="stat-value text-state-success">
          {completedOrders.length}
        </div>
        <div className="stat-label">Órdenes Completadas</div>
      </div>

      <div className="stat-card">
        <div className="stat-value text-content-secondary">{totalRecipes}</div>
        <div className="stat-label">Total Recetas</div>
      </div>
    </div>
  );
}
