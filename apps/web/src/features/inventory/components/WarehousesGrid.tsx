import type { Warehouse } from "../types/inventory.types";
import { Badge } from "@/common/components/Badge";

interface WarehousesGridProps {
  warehouses: Warehouse[];
}

export function WarehousesGrid({ warehouses }: WarehousesGridProps) {
  if (warehouses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <h3 className="text-lg font-semibold text-content-primary mb-1">Sin bodegas</h3>
        <p className="text-sm text-content-secondary mb-4 max-w-sm">No hay almacenes registrados.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {warehouses.map((w) => (
        <div key={w.localId} className="card p-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-content-primary">{w.name}</h3>
              {w.code && <p className="text-sm text-content-secondary">{w.code}</p>}
              {w.address && <p className="text-sm text-content-tertiary">{w.address}</p>}
            </div>
            {w.isDefault && (
              <Badge variant="success">Principal</Badge>
            )}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${w.isActive ? "bg-state-success" : "bg-surface-400"}`} />
            <span className="text-sm text-content-secondary">{w.isActive ? "Activa" : "Inactiva"}</span>
          </div>
        </div>
      ))}
    </div>
  );
}