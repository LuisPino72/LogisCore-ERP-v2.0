import type { Receiving } from "../types/purchases.types";

interface ReceivingsListProps {
  receivings: Receiving[];
}

export function ReceivingsList({ receivings }: ReceivingsListProps) {
  if (receivings.length === 0) {
    return (
      <div className="card">
        <div className="card-body">
          <h3 className="card-title mb-4">Recepciones</h3>
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <h3 className="text-lg font-semibold text-content-primary mb-1">No hay recepciones</h3>
            <p className="text-sm text-content-secondary mb-4 max-w-sm">Las recepciones aparecerán aquí cuando recibas órdenes de compra</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-body">
        <h3 className="card-title mb-4">Recepciones</h3>
        <div className="space-y-2">
          {receivings.map((receiving) => (
            <div key={receiving.localId} className="flex items-center justify-between bg-surface-50 rounded-lg border border-surface-200 p-3">
              <div>
                <span className="font-mono text-xs text-content-tertiary">{receiving.localId.slice(0, 8)}</span>
                <span className="ml-2 text-sm text-content-secondary">→ {receiving.purchaseLocalId.slice(0, 8)}</span>
              </div>
              <span className="text-sm font-medium text-content-primary">${receiving.totalCost.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}