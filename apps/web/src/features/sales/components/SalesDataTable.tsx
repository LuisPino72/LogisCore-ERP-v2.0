import { useMemo, useState } from "react";
import { Search, RotateCcw, Ban, CreditCard } from "lucide-react";
import { Badge } from "@/common/components/Badge";
import { Input, Select, Button } from "@/common";
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
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por número o ID..."
            className="pl-10"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(value) => setStatusFilter(value)}
          options={[
            { value: "all", label: "Todos los estados" },
            { value: "completed", label: "Completadas" },
            { value: "voided", label: "Anuladas" },
            { value: "refunded", label: "Reembolsadas" }
          ]}
          className="w-40"
        />
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
                      <Button
                        onClick={() => onView(sale)}
                        variant="ghost"
                        size="sm"
                        title="Ver detalles"
                      >
                        <CreditCard className="w-4 h-4" />
                      </Button>
                      {sale.status === "completed" && (
                        <>
                          <Button
                            onClick={() => onRefund(sale.localId)}
                            variant="ghost"
                            size="sm"
                            title="Reembolsar"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => onVoid(sale.localId)}
                            variant="ghost"
                            size="sm"
                            className="text-state-error"
                            title="Anular"
                          >
                            <Ban className="w-4 h-4" />
                          </Button>
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
