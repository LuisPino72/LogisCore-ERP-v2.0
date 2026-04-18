import { useMemo, useState } from "react";
import { Badge } from "@/common/components/Badge";
import type { BoxClosing } from "../types/sales.types";
import { getBoxStatusLabel, getBoxStatusVariant } from "../utils/sales.utils";

interface BoxClosingsListProps {
  boxClosings: BoxClosing[];
  warehouses: { localId: string; name: string }[];
  onCloseBox: (warehouseLocalId: string) => void;
}

export function BoxClosingsList({
  boxClosings,
  warehouses,
  onCloseBox
}: BoxClosingsListProps) {
  const [warehouseFilter, setWarehouseFilter] = useState("all");

  const filteredClosings = useMemo(() => {
    let result = boxClosings;
    
    if (warehouseFilter !== "all") {
      result = result.filter(b => b.warehouseLocalId === warehouseFilter);
    }
    
    return result.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [boxClosings, warehouseFilter]);

  const [now] = useState(() => Date.now());

  return (
    <div className="space-y-4">
      <div className="flex gap-4 flex-wrap">
        <select
          value={warehouseFilter}
          onChange={(e) => setWarehouseFilter(e.target.value)}
          className="input w-48"
        >
          <option value="all">Todas las bodegas</option>
          {warehouses.map(w => (
            <option key={w.localId} value={w.localId}>{w.name}</option>
          ))}
        </select>
      </div>

      {filteredClosings.length === 0 ? (
        <div className="text-center py-12 text-content-secondary">
          No hay cierres de caja registrados
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface-50 border-b border-surface-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-content-secondary uppercase">Fecha Apertura</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-content-secondary uppercase">Bodega</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-content-secondary uppercase">Monto Apertura</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-content-secondary uppercase">Ventas</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-content-secondary uppercase">Diferencia</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-content-secondary uppercase">Estado</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-content-secondary uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {filteredClosings.map((closing) => {
                const warehouse = warehouses.find(w => w.localId === closing.warehouseLocalId);
                const isOpen = closing.status === "open";
                const diff = closing.differenceAmount ?? 0;
                
                return (
                  <tr key={closing.localId} className="hover:bg-surface-50">
                    <td className="px-4 py-3 text-sm">
                      {new Date(closing.createdAt).toLocaleString("es-VE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                      {isOpen && (
                        <div className="text-xs text-content-tertiary">
                          Abierta desde hace{" "}
                          {Math.floor((now - new Date(closing.openedAt).getTime()) / (1000 * 60 * 60))}h
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {warehouse?.name ?? closing.warehouseLocalId}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono">
                      ${closing.openingAmount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {closing.salesCount ?? 0}
                    </td>
                    <td className={`px-4 py-3 text-sm text-right font-mono ${diff > 0 ? "text-state-success" : diff < 0 ? "text-state-error" : ""}`}>
                      {isOpen ? "-" : `${diff > 0 ? "+" : ""}${diff.toFixed(2)}`}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={getBoxStatusVariant(closing.status)}>
                        {getBoxStatusLabel(closing.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isOpen && (
                        <button
                          onClick={() => onCloseBox(closing.warehouseLocalId)}
                          className="btn btn-secondary text-sm py-1"
                        >
                          Cerrar Caja
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
