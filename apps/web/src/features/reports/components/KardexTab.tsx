import { useState, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { KardexEntryExtended, ReportsFilters } from "../types/reports.types";
import { SearchInput } from "@/common/components/SearchInput";
import { Badge } from "@/common/components/Badge";
import { Select } from "@/common/components/Select";
import { Package, ArrowDownLeft, ArrowUpRight, RotateCcw } from "lucide-react";

interface KardexTabProps {
  kardex: KardexEntryExtended[];
  isLoading: boolean;
  warehouses: { localId: string; name: string }[];
  onFiltersChange?: (filters: ReportsFilters) => void;
}

interface KardexRowProps {
  entry: KardexEntryExtended;
  isExpanded: boolean;
  onToggle: () => void;
}

function KardexRow({ entry, isExpanded, onToggle }: KardexRowProps) {
  const formatQty = (qty: number) => {
    if (entry.isWeighted) {
      return qty.toLocaleString("es-VE", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    }
    return qty.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatCurrency = (amount: number) =>
    amount.toLocaleString("es-VE", { style: "currency", currency: "VES" });

  return (
    <div className="border-b border-surface-100">
      <div
        className="grid grid-cols-5 gap-2 px-4 py-3 cursor-pointer hover:bg-surface-50 transition-colors"
        onClick={onToggle}
      >
        <div className="col-span-1 flex items-center gap-2">
          <Package className="w-4 h-4 text-content-tertiary" />
          <div>
            <div className="text-sm font-medium text-content-primary">
              {entry.productName || entry.productLocalId.slice(0, 8)}
            </div>
            <div className="text-xs text-content-tertiary">
              {entry.warehouseName}
            </div>
          </div>
        </div>
        <div className="col-span-1 text-right">
          <div className="text-sm font-medium text-state-success">
            {formatQty(entry.totalIn)}
          </div>
          <div className="text-xs text-content-tertiary">Entrada</div>
        </div>
        <div className="col-span-1 text-right">
          <div className="text-sm font-medium text-state-info">
            {formatQty(entry.totalOut)}
          </div>
          <div className="text-xs text-content-tertiary">Salida</div>
        </div>
        <div className="col-span-1 text-right">
          <div className="text-sm font-bold text-content-primary">
            {formatQty(entry.currentBalance)}
          </div>
          <div className="text-xs text-content-tertiary">Saldo</div>
        </div>
        <div className="col-span-1 flex items-center justify-center">
          <Badge variant={movementColors[entry.lastMovementType] || "info"}>
            {movementLabels[entry.lastMovementType] || entry.lastMovementType}
          </Badge>
        </div>
      </div>

      {isExpanded && entry.costLayers && entry.costLayers.length > 0 && (
        <div className="bg-surface-50 px-4 py-3 border-t border-surface-200">
          <div className="text-xs font-semibold text-content-secondary uppercase tracking-wider mb-2">
            Capas FIFO - Costo por Lote
          </div>
          <div className="space-y-2">
            {entry.costLayers.map((layer, idx) => (
              <div
                key={layer.layerId}
                className="flex items-center justify-between text-sm bg-white p-2 rounded border border-surface-200"
              >
                <div className="flex items-center gap-2">
                  <span className="text-content-tertiary">#{idx + 1}</span>
                  <span className="font-mono text-xs text-content-secondary">
                    {layer.layerId.slice(0, 8)}...
                  </span>
                  <span className="text-content-tertiary">
                    {new Date(layer.receivedAt).toLocaleDateString("es-VE")}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-content-secondary">
                    Qty: {formatQty(layer.remainingQty)}
                  </span>
                  <span className="text-brand-600 font-medium">
                    {formatCurrency(layer.unitCost)}/u
                  </span>
                  <span className="text-state-success font-semibold">
                    {formatCurrency(layer.totalCost)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function KardexTab({ kardex, isLoading, warehouses, onFiltersChange: _onFiltersChange }: KardexTabProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const filteredKardex = useMemo(() => {
    return kardex.filter((entry) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesProduct = entry.productName?.toLowerCase().includes(query);
        const matchesId = entry.productLocalId.toLowerCase().includes(query);
        if (!matchesProduct && !matchesId) return false;
      }
      if (selectedWarehouse && entry.warehouseLocalId !== selectedWarehouse) {
        return false;
      }
      return true;
    });
  }, [kardex, searchQuery, selectedWarehouse]);

  const virtualizer = useVirtualizer({
    count: filteredKardex.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => expandedRows.size > 0 ? 200 : 52,
    overscan: 5
  });

  const toggleExpanded = (productId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const totalValue = useMemo(
    () => filteredKardex.reduce((sum, e) => sum + (e.costLayers?.reduce((s, l) => s + l.totalCost, 0) || 0), 0),
    [filteredKardex]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <SearchInput
            placeholder="Buscar producto..."
            value={searchQuery}
            onChange={setSearchQuery}
          />
        </div>
        <Select
          className="w-full sm:w-48"
          value={selectedWarehouse}
          onChange={(val) => setSelectedWarehouse(val)}
          options={[
            { label: "Todas las bodegas", value: "" },
            ...warehouses.map((w) => ({ label: w.name, value: w.localId }))
          ]}
        />
      </div>

      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <ArrowDownLeft className="w-4 h-4 text-state-success" />
          <span className="text-content-tertiary">Total Entradas:</span>
          <span className="font-semibold text-state-success">
            {filteredKardex.reduce((s, e) => s + e.totalIn, 0).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ArrowUpRight className="w-4 h-4 text-state-info" />
          <span className="text-content-tertiary">Total Salidas:</span>
          <span className="font-semibold text-state-info">
            {filteredKardex.reduce((s, e) => s + e.totalOut, 0).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-brand-500" />
          <span className="text-content-tertiary">Valor Total:</span>
          <span className="font-semibold text-brand-600">
            {totalValue.toLocaleString("es-VE", { style: "currency", currency: "VES" })}
          </span>
        </div>
      </div>

      <div className="border border-surface-200 rounded-lg overflow-hidden">
        <div className="bg-surface-50 border-b border-surface-200 grid grid-cols-5 gap-2 px-4 py-3 text-xs font-semibold text-content-secondary uppercase tracking-wider">
          <div className="col-span-1">Producto</div>
          <div className="col-span-1 text-right">Entrada</div>
          <div className="col-span-1 text-right">Salida</div>
          <div className="col-span-1 text-right">Saldo</div>
          <div className="col-span-1 text-center">Último Mov.</div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="spinner" />
            <span className="ml-3 text-content-secondary">Cargando kardex...</span>
          </div>
        ) : filteredKardex.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-content-tertiary">
            <Package className="w-8 h-8 mb-2" />
            <span>No hay movimientos de inventario</span>
          </div>
        ) : (
          <div ref={parentRef} className="h-[400px] overflow-auto">
            <div style={{ height: `${virtualizer.getTotalSize()}px`, width: "100%", position: "relative" }}>
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const entry = filteredKardex[virtualRow.index];
                return (
                  <div
                    key={virtualRow.key}
                    data-index={virtualRow.index}
                    ref={virtualizer.measureElement}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualRow.start}px)`
                    }}
                  >
                    <KardexRow
                      entry={entry}
                      isExpanded={expandedRows.has(`${entry.productLocalId}-${entry.warehouseLocalId}`)}
                      onToggle={() => toggleExpanded(`${entry.productLocalId}-${entry.warehouseLocalId}`)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
