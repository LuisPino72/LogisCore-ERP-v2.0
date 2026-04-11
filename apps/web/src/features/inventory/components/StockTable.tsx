import type { Product } from "@/features/products/types/products.types";
import type { Warehouse } from "../types/inventory.types";

interface StockItem {
  productLocalId: string;
  warehouseLocalId: string;
  qty: number;
}

interface StockTableProps {
  items: StockItem[];
  products: Product[];
  warehouses: Warehouse[];
}

function formatQty(qty: number, isWeighted: boolean | null | undefined): string {
  return isWeighted ? qty.toFixed(4) : qty.toFixed(2);
}

export function StockTable({ items, products, warehouses }: StockTableProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <h3 className="text-lg font-semibold text-content-primary mb-1">Sin existencias</h3>
        <p className="text-sm text-content-secondary mb-4 max-w-sm">No hay productos en stock. Registra un movimiento de entrada.</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <table className="w-full">
        <thead className="bg-surface-50 border-b border-surface-200">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-semibold text-content-secondary uppercase">Producto</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-content-secondary uppercase">Bodega</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-content-secondary uppercase">Cantidad</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-100">
          {items.map((item, idx) => {
            const product = products.find(p => p.localId === item.productLocalId);
            const warehouse = warehouses.find(w => w.localId === item.warehouseLocalId);
            return (
              <tr key={idx} className="hover:bg-surface-50">
                <td className="px-4 py-3 text-sm">{product?.name ?? item.productLocalId}</td>
                <td className="px-4 py-3 text-sm">{warehouse?.name ?? item.warehouseLocalId}</td>
                <td className="px-4 py-3 text-sm text-right font-mono">
                  {formatQty(item.qty, product?.isWeighted)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}