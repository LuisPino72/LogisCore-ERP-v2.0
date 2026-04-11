import type { InventoryLot } from "../types/inventory.types";
import type { Product } from "@/features/products/types/products.types";
import type { Warehouse } from "../types/inventory.types";

interface LotsTableProps {
  lots: InventoryLot[];
  products: Product[];
  warehouses: Warehouse[];
}

function formatQty(qty: number, isWeighted: boolean | null | undefined): string {
  return isWeighted ? qty.toFixed(4) : qty.toFixed(2);
}

function getLotAge(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
}

export function LotsTable({ lots, products, warehouses }: LotsTableProps) {
  if (lots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <h3 className="text-lg font-semibold text-content-primary mb-1">Sin lotes</h3>
        <p className="text-sm text-content-secondary mb-4 max-w-sm">No hay capas de costo FIFO activas.</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <table className="w-full">
        <thead className="bg-surface-50 border-b border-surface-200">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-semibold text-content-secondary uppercase">Lote</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-content-secondary uppercase">Producto</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-content-secondary uppercase">Bodega</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-content-secondary uppercase">Cantidad</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-content-secondary uppercase">Costo Unit.</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-content-secondary uppercase">Valor Total</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-content-secondary uppercase">Antigüedad</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-100">
          {lots.map((lot) => {
            const product = products.find(p => p.localId === lot.productLocalId);
            const age = getLotAge(lot.createdAt);
            return (
              <tr key={lot.localId} className="hover:bg-surface-50">
                <td className="px-4 py-3 text-sm font-mono">{lot.localId.slice(0, 8)}</td>
                <td className="px-4 py-3 text-sm">{product?.name ?? lot.productLocalId}</td>
                <td className="px-4 py-3 text-sm">
                  {warehouses.find(w => w.localId === lot.warehouseLocalId)?.name ?? lot.warehouseLocalId}
                </td>
                <td className="px-4 py-3 text-sm text-right font-mono">
                  {formatQty(lot.quantity, product?.isWeighted)}
                </td>
                <td className="px-4 py-3 text-sm text-right font-mono">
                  ${lot.unitCost.toFixed(4)}
                </td>
                <td className="px-4 py-3 text-sm text-right font-mono">
                  ${(lot.quantity * lot.unitCost).toFixed(4)}
                </td>
                <td className="px-4 py-3 text-sm text-content-secondary">{age} días</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}