import type { InventoryCount } from "../types/inventory.types";

interface InventoryKPIsProps {
  totalValue: number;
  lowStockCount: number;
  lastCount: InventoryCount | null | undefined;
}

export function InventoryKPIs({ totalValue, lowStockCount, lastCount }: InventoryKPIsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="card p-4 flex items-center gap-4">
        <div className="p-3 bg-brand-100 rounded-xl">
          <span className="block w-6 h-6 text-brand-600">💵</span>
        </div>
        <div>
          <p className="text-xs text-content-tertiary uppercase tracking-wide">Total Valorizado</p>
          <p className="text-xl font-bold text-content-primary">${totalValue.toFixed(2)}</p>
        </div>
      </div>
      <div className="card p-4 flex items-center gap-4">
        <div className="p-3 bg-state-warning/10 rounded-xl">
          <span className="block w-6 h-6 text-state-warning">⚠️</span>
        </div>
        <div>
          <p className="text-xs text-content-tertiary uppercase tracking-wide">Stock Crítico</p>
          <p className="text-xl font-bold text-content-primary">{lowStockCount}</p>
        </div>
      </div>
      <div className="card p-4 flex items-center gap-4">
        <div className="p-3 bg-state-info/10 rounded-xl">
          <span className="block w-6 h-6 text-state-info">🕐</span>
        </div>
        <div>
          <p className="text-xs text-content-tertiary uppercase tracking-wide">Último Conteo</p>
          <p className="text-xl font-bold text-content-primary">
            {lastCount ? new Date(lastCount.countedAt ?? lastCount.createdAt).toLocaleDateString() : "N/A"}
          </p>
        </div>
      </div>
    </div>
  );
}