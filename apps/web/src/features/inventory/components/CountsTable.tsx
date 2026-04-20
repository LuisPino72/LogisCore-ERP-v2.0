import type { InventoryCount } from "../types/inventory.types";
import type { Product } from "@/features/products/types/products.types";
import type { Warehouse } from "../types/inventory.types";
import { Badge } from "@/common/components/Badge";
import { Button } from "@/common/components/Button";

interface CountsTableProps {
  counts: InventoryCount[];
  products: Product[];
  warehouses: Warehouse[];
  onPostCount: (localId: string) => void;
}

const countStatusVariants: Record<string, "default" | "warning" | "success" | "error"> = {
  draft: "default",
  posted: "success",
  voided: "error"
};

const countStatusLabels: Record<string, string> = {
  draft: "Borrador",
  posted: "Contabilizado",
  voided: "Anulado"
};

function formatQty(qty: number, isWeighted: boolean | null | undefined): string {
  return isWeighted ? qty.toFixed(4) : qty.toFixed(2);
}

export function CountsTable({ counts, products, warehouses, onPostCount }: CountsTableProps) {
  const recentCounts = counts.slice(-20).reverse();

  if (recentCounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <h3 className="text-lg font-semibold text-content-primary mb-1">Sin conteos</h3>
        <p className="text-sm text-content-secondary mb-4 max-w-sm">No hay conteos de inventario registrados.</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <table className="w-full">
        <thead className="bg-surface-50 border-b border-surface-200">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-semibold text-content-secondary uppercase">Estado</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-content-secondary uppercase">Producto</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-content-secondary uppercase">Bodega</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-content-secondary uppercase">Esperado</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-content-secondary uppercase">Contado</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-content-secondary uppercase">Diferencia</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-content-secondary uppercase">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-100">
          {recentCounts.map((c) => {
            const product = products.find(p => p.localId === c.productLocalId);
            return (
              <tr key={c.localId} className="hover:bg-surface-50">
                <td className="px-4 py-3">
                  <Badge variant={countStatusVariants[c.status] ?? "default"}>
                    {countStatusLabels[c.status]}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm">{product?.name ?? c.productLocalId}</td>
                <td className="px-4 py-3 text-sm">
                  {warehouses.find(w => w.localId === c.warehouseLocalId)?.name ?? c.warehouseLocalId}
                </td>
                <td className="px-4 py-3 text-sm text-right font-mono">
                  {formatQty(c.expectedQty, product?.isWeighted)}
                </td>
                <td className="px-4 py-3 text-sm text-right font-mono">
                  {formatQty(c.countedQty, product?.isWeighted)}
                </td>
                <td className={`px-4 py-3 text-sm text-right font-mono ${c.differenceQty > 0 ? "text-state-success" : c.differenceQty < 0 ? "text-state-error" : ""}`}>
                  {c.differenceQty > 0 ? "+" : ""}{formatQty(c.differenceQty, product?.isWeighted)}
                </td>
                <td className="px-4 py-3">
                  {c.status === "draft" && (
                    <Button 
                      variant="ghost"
                      size="sm"
                      onClick={() => onPostCount(c.localId)}
                      className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                    >
                      Publicar
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}