import type { LowStockProduct } from "../types/dashboard.types";
import { Tooltip } from "@/common";

interface LowStockListProps {
  products: LowStockProduct[];
  currencySymbol?: string;
  _currencySymbol?: string;
}

export function LowStockList({ products, currencySymbol: _currencySymbol = "$" }: LowStockListProps) {
  if (products.length === 0) {
    return (
      <div className="text-center py-6 text-content-tertiary text-sm">
        No hay productos con stock crítico
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {products.map((product) => (
        <Tooltip 
          key={product.localId}
          content={`Mínimo: ${product.minStock ?? "N/A"} | Stock actual: ${product.currentStock.toFixed(4)}`}
          position="right"
        >
          <div className="flex items-center justify-between p-2 rounded-lg bg-red-50 border border-red-100 cursor-help">
            <div className="flex items-center gap-2 min-w-0">
              <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-sm text-content-primary truncate font-medium">
                {product.name}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-content-tertiary">
                {product.warehouseName}
              </span>
              <span className="text-sm font-bold text-red-600">
                {product.currentStock.toFixed(4)}
              </span>
            </div>
          </div>
        </Tooltip>
      ))}
    </div>
  );
}
