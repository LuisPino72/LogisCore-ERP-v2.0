import { useMemo, useState } from "react";
import { Search, RotateCcw, Ban, CreditCard } from "lucide-react";
import { Badge } from "@/common/components/Badge";
import type { Sale } from "../types/sales.types";
import {
  formatCurrency,
  getSaleStatusLabel,
  getSaleStatusVariant
} from "../utils/sales.utils";

interface SalesDataTableProps {
  sales: Sale[];
  onView: (sale: Sale) => void;
  onVoid: (localId: string) => void;
  onRefund: (localId: string) => void;
  onRestore: (localId: string) => void;
}

export function SalesDataTable({
  sales,
  onView,
  onVoid,
  onRefund,
  onRestore: _onRestore
}: SalesDataTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredSales = useMemo(() => {
    let result = sales;
    
    if (statusFilter !== "all") {
      result = result.filter(s => s.status === statusFilter);
    }
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.saleNumber.toLowerCase().includes(q) ||
        s.localId.toLowerCase().includes(q)
      );
    }
    
    return result.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [sales, statusFilter, searchQuery]);

  return (
    <div className="space-y-4">
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-tertiary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por número o ID..."
            className="input pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input w-40"
        >
          <option value="all">Todos los estados</option>
          <option value="completed">Completadas</option>
          <option value="voided">Anuladas</option>
          <option value="refunded">Reembolsadas</option>
        </select>
      </div>

      {filteredSales.length === 0 ? (
        <div className="text-center py-12 text-content-secondary">
          No hay ventas registradas
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface-50 border-b border-surface-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-content-secondary uppercase">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-content-secondary uppercase">Fecha</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-content-secondary uppercase">Bodega</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-content-secondary uppercase">Total</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-content-secondary uppercase">Estado</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-content-secondary uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {filteredSales.map((sale) => (
                <tr key={sale.localId} className="hover:bg-surface-50">
                  <td className="px-4 py-3 text-sm font-mono">{sale.saleNumber || sale.localId.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-sm">
                    {new Date(sale.createdAt).toLocaleString("es-VE", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </td>
                  <td className="px-4 py-3 text-sm">{sale.warehouseLocalId}</td>
                  <td className="px-4 py-3 text-sm text-right font-mono">
                    {formatCurrency(sale.total, sale.currency)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={getSaleStatusVariant(sale.status)}>
                      {getSaleStatusLabel(sale.status)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onView(sale)}
                        className="p-1.5 rounded hover:bg-surface-100 text-content-secondary"
                        title="Ver detalles"
                      >
                        <CreditCard className="w-4 h-4" />
                      </button>
                      {sale.status === "completed" && (
                        <>
                          <button
                            onClick={() => onRefund(sale.localId)}
                            className="p-1.5 rounded hover:bg-surface-100 text-state-info"
                            title="Reembolsar"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onVoid(sale.localId)}
                            className="p-1.5 rounded hover:bg-surface-100 text-state-error"
                            title="Anular"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
