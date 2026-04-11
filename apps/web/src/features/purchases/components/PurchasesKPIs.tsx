import { Tooltip } from "@/common";

interface PurchasesKPIsProps {
  totalCompradoMes: number;
  ordenesPendientes: number;
  proveedoresActivos: number;
}

export function PurchasesKPIs({ totalCompradoMes, ordenesPendientes, proveedoresActivos }: PurchasesKPIsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Tooltip content="Monto total de compras realizadas en el mes actual" position="top">
        <div className="card p-4 flex items-center gap-4 cursor-help hover:bg-surface-50 transition-colors">
          <div className="p-3 bg-brand-100 rounded-xl">
            <span className="block w-6 h-6 text-center">💰</span>
          </div>
          <div>
            <p className="text-xs text-content-tertiary uppercase tracking-wide">Total Comprado (Mes)</p>
            <p className="text-xl font-bold text-content-primary">${totalCompradoMes.toFixed(2)}</p>
          </div>
        </div>
      </Tooltip>
      <Tooltip content="Órdenes de compra que esperan ser recibidas" position="top">
        <div className="card p-4 flex items-center gap-4 cursor-help hover:bg-surface-50 transition-colors">
          <div className="p-3 bg-state-warning/10 rounded-xl">
            <span className="block w-6 h-6 text-center">📋</span>
          </div>
          <div>
            <p className="text-xs text-content-tertiary uppercase tracking-wide">Órdenes Pendientes</p>
            <p className="text-xl font-bold text-content-primary">{ordenesPendientes}</p>
          </div>
        </div>
      </Tooltip>
      <Tooltip content="Proveedores con al menos una compra en los últimos 30 días" position="top">
        <div className="card p-4 flex items-center gap-4 cursor-help hover:bg-surface-50 transition-colors">
          <div className="p-3 bg-state-info/10 rounded-xl">
            <span className="block w-6 h-6 text-center">🏢</span>
          </div>
          <div>
            <p className="text-xs text-content-tertiary uppercase tracking-wide">Proveedores Activos</p>
            <p className="text-xl font-bold text-content-primary">{proveedoresActivos}</p>
          </div>
        </div>
      </Tooltip>
    </div>
  );
}