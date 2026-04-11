import type { StockMovement, StockMovementType } from "../types/inventory.types";
import type { Product } from "@/features/products/types/products.types";
import type { Warehouse } from "../types/inventory.types";
import { Badge } from "@/common/components/Badge";

interface MovementsTableProps {
  movements: StockMovement[];
  products: Product[];
  warehouses: Warehouse[];
}

const movementTypeLabels: Record<StockMovementType, string> = {
  purchase_in: "Entrada Compra",
  sale_out: "Salida Venta",
  adjustment_in: "Ajuste Entrada",
  adjustment_out: "Ajuste Salida",
  production_in: "Entrada Producción",
  production_out: "Salida Producción",
  transfer_in: "Transferencia Entrada",
  transfer_out: "Transferencia Salida",
  count_adjustment: "Ajuste Conteo"
};

const movementTypeVariants: Record<StockMovementType, "success" | "info" | "warning" | "error"> = {
  purchase_in: "success",
  sale_out: "info",
  adjustment_in: "warning",
  adjustment_out: "error",
  production_in: "success",
  production_out: "info",
  transfer_in: "warning",
  transfer_out: "info",
  count_adjustment: "warning"
};

function formatQty(qty: number, isWeighted: boolean | null | undefined): string {
  return isWeighted ? qty.toFixed(4) : qty.toFixed(2);
}

export function MovementsTable({ movements, products, warehouses }: MovementsTableProps) {
  const recentMovements = movements.slice(-20).reverse();

  if (recentMovements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <h3 className="text-lg font-semibold text-content-primary mb-1">Sin movimientos</h3>
        <p className="text-sm text-content-secondary mb-4 max-w-sm">No hay movimientos de stock registrados.</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <table className="w-full">
        <thead className="bg-surface-50 border-b border-surface-200">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-semibold text-content-secondary uppercase">Tipo</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-content-secondary uppercase">Producto</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-content-secondary uppercase">Bodega</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-content-secondary uppercase">Cantidad</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-content-secondary uppercase">Notas</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-100">
          {recentMovements.map((m) => {
            const product = products.find(p => p.localId === m.productLocalId);
            return (
              <tr key={m.localId} className="hover:bg-surface-50">
                <td className="px-4 py-3">
                  <Badge variant={movementTypeVariants[m.movementType]}>
                    {movementTypeLabels[m.movementType]}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm">{product?.name ?? m.productLocalId}</td>
                <td className="px-4 py-3 text-sm">
                  {warehouses.find(w => w.localId === m.warehouseLocalId)?.name ?? m.warehouseLocalId}
                </td>
                <td className="px-4 py-3 text-sm text-right font-mono">
                  {formatQty(m.quantity, product?.isWeighted)}
                </td>
                <td className="px-4 py-3 text-sm text-content-secondary">{m.notes ?? "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}