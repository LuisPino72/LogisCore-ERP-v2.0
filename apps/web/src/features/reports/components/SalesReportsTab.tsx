import { useState, useMemo, useRef, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { SaleWithDetails, ReportsFilters } from "../types/reports.types";
import { SearchInput } from "@/common/components/SearchInput";
import { Badge } from "@/common/components/Badge";
import { Calendar, Filter } from "lucide-react";

interface SalesReportsTabProps {
  sales: SaleWithDetails[];
  isLoading: boolean;
  warehouses: { localId: string; name: string }[];
  onFiltersChange?: (filters: ReportsFilters) => void;
}

const statusColors: Record<string, "success" | "error" | "info" | "warning"> = {
  completed: "success",
  voided: "error",
  refunded: "info"
};

export function SalesReportsTab({
  sales,
  isLoading,
  warehouses,
  onFiltersChange
}: SalesReportsTabProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("");
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);

  useEffect(() => {
    onFiltersChange?.({
      searchQuery,
      warehouseLocalId: selectedWarehouse || undefined,
      dateRange: dateRange || undefined
    });
  }, [searchQuery, selectedWarehouse, dateRange, onFiltersChange]);

  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!sale.localId.toLowerCase().includes(query)) {
          return false;
        }
      }
      if (selectedWarehouse) {
        return true;
      }
      return true;
    });
  }, [sales, searchQuery, selectedWarehouse]);

  const virtualizer = useVirtualizer({
    count: filteredSales.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 10
  });

  const formatCurrency = (amount: number) => amount.toLocaleString("es-VE", { style: "currency", currency: "VES" });

  const totalAmount = useMemo(() => filteredSales.reduce((sum, s) => sum + s.total, 0), [filteredSales]);
  const totalUsd = useMemo(() => filteredSales.reduce((sum, s) => sum + (s.totalUsd || 0), 0), [filteredSales]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <SearchInput
            placeholder="Buscar por ID de venta..."
            value={searchQuery}
            onChange={setSearchQuery}
          />
        </div>
        
        <select
          className="input w-full sm:w-48"
          value={selectedWarehouse}
          onChange={(e) => setSelectedWarehouse(e.target.value)}
        >
          <option value="">Todas las bodegas</option>
          {warehouses.map((w) => (
            <option key={w.localId} value={w.localId}>
              {w.name}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-content-tertiary" />
          <input
            type="date"
            className="input w-36"
            value={dateRange?.start || ""}
            onChange={(e) => setDateRange((prev) => ({ start: e.target.value, end: prev?.end || "" }))}
          />
          <span className="text-content-tertiary">-</span>
          <input
            type="date"
            className="input w-36"
            value={dateRange?.end || ""}
            onChange={(e) => setDateRange((prev) => ({ start: prev?.start || "", end: e.target.value }))}
          />
        </div>
      </div>

      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-content-tertiary">Total:</span>
          <span className="font-semibold text-state-info">{formatCurrency(totalAmount)}</span>
        </div>
        {totalUsd > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-content-tertiary">USD:</span>
            <span className="font-semibold text-brand-600">${totalUsd.toFixed(2)}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-content-tertiary">Registros:</span>
          <span className="font-semibold">{filteredSales.length}</span>
        </div>
      </div>

      <div className="border border-surface-200 rounded-lg overflow-hidden">
        <div className="bg-surface-50 border-b border-surface-200 grid grid-cols-7 gap-2 px-4 py-3 text-xs font-semibold text-content-secondary uppercase tracking-wider">
          <div className="col-span-1">Fecha</div>
          <div className="col-span-2">ID Venta</div>
          <div className="col-span-1 text-right">Items</div>
          <div className="col-span-1 text-right">Total</div>
          <div className="col-span-1 text-right">USD</div>
          <div className="col-span-1 text-center">Estado</div>
        </div>

        <div ref={parentRef} className="max-h-[400px] overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="spinner" />
              <span className="ml-3 text-content-secondary">Cargando ventas...</span>
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-content-tertiary">
              <Filter className="w-8 h-8 mb-2" />
              <span>No hay ventas para mostrar</span>
            </div>
          ) : (
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: "100%",
                position: "relative"
              }}
            >
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const sale = filteredSales[virtualRow.index];
                return (
                  <div
                    key={sale.localId}
                    className="grid grid-cols-7 gap-2 px-4 py-3 border-b border-surface-100 hover:bg-surface-50 transition-colors absolute top-0 left-0 w-full"
                    style={{
                      transform: `translateY(${virtualRow.start}px)`
                    }}
                  >
                    <div className="col-span-1 text-sm text-content-secondary">
                      {new Date(sale.saleDate).toLocaleDateString("es-VE")}
                    </div>
                    <div className="col-span-2 text-sm font-mono text-content-primary">
                      {sale.localId.slice(0, 8)}...
                    </div>
                    <div className="col-span-1 text-sm text-right text-content-secondary">
                      {sale.itemsCount}
                    </div>
                    <div className="col-span-1 text-sm text-right font-medium text-state-info">
                      {formatCurrency(sale.total)}
                    </div>
                    <div className="col-span-1 text-sm text-right text-brand-600">
                      ${sale.totalUsd?.toFixed(2) || "0.00"}
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <Badge variant={statusColors[sale.status] || "info"}>
                        {sale.status === "completed" ? "Completada" : sale.status === "voided" ? "Anulada" : "Reembolsada"}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
