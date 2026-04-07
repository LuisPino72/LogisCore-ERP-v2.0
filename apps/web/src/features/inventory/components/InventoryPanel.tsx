/**
 * Panel Maestro de Inventario.
 * Diseño con pestañas para: Existencias, Movimientos, Conteos, Bodegas, Lotes (FIFO)
 * 
 * Características:
 * - Navegación por Tabs
 * - KPIs header: Total Valorizado, Stock Crítico, Último Conteo
 * - Badges de estado para tipos de movimiento
 * - Validaciones: stock no negativo, 4 decimales para pesables
 */

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { eventBus } from "@/lib/core/runtime";
import { useInventory } from "../hooks/useInventory";
import { Badge } from "@/common/components/Badge";
import { Modal } from "@/common/components/Modal";
import { LoadingSpinner } from "@/common/components/EmptyState";
import { Tabs, type TabItem } from "@/common/components/Tabs";
import { SearchInput } from "@/common/components/SearchInput";
import type { 
  InventoryActorContext, 
  InventoryTenantContext,
  CreateWarehouseInput,
  RecordStockMovementInput,
  CreateInventoryCountInput,
  StockMovementType
} from "../types/inventory.types";
import type { Product } from "@/features/products/types/products.types";

interface InventoryPanelProps {
  tenantSlug: string;
  actor: InventoryActorContext;
  products: Product[];
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

export function InventoryPanel({ tenantSlug, actor, products }: InventoryPanelProps) {
  const tenant: InventoryTenantContext = { tenantSlug };
  
  const {
    state,
    refresh,
    createWarehouse,
    recordStockMovement,
    createInventoryCount,
    postInventoryCount
  } = useInventory({ tenant, actor });

  const [searchQuery, setSearchQuery] = useState("");
  const [, setActiveTab] = useState("stock");
  const [warehouseFilter, setWarehouseFilter] = useState("all");

  const [showMovementModal, setShowMovementModal] = useState(false);
  const [showCountModal, setShowCountModal] = useState(false);
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);

  const [movementForm, setMovementForm] = useState<RecordStockMovementInput>({
    productLocalId: "",
    warehouseLocalId: "",
    movementType: "purchase_in",
    quantity: 1,
    notes: "",
    isWeightedProduct: false
  });

  const [countForm, setCountForm] = useState<CreateInventoryCountInput>({
    productLocalId: "",
    warehouseLocalId: "",
    countedQty: 0,
    reason: ""
  });

  const [warehouseForm, setWarehouseForm] = useState<CreateWarehouseInput>({
    name: "",
    code: "",
    address: "",
    isDefault: false
  });

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const offStock = eventBus.on("INVENTORY.STOCK_UPDATED", () => void refresh());
    const offWarehouse = eventBus.on("INVENTORY.WAREHOUSE_CREATED", () => void refresh());
    const offMovement = eventBus.on("INVENTORY.STOCK_MOVEMENT_RECORDED", () => void refresh());
    const offCountPosted = eventBus.on("INVENTORY.COUNT_POSTED", () => void refresh());
    
    return () => {
      offStock();
      offWarehouse();
      offMovement();
      offCountPosted();
    };
  }, [refresh]);

  const filteredMovements = useMemo(() => {
    let filtered = state.movements;
    if (warehouseFilter !== "all") {
      filtered = filtered.filter(m => m.warehouseLocalId === warehouseFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(m => 
        m.movementType.toLowerCase().includes(q) ||
        m.productLocalId.toLowerCase().includes(q) ||
        m.notes?.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [state.movements, warehouseFilter, searchQuery]);

  const filteredCounts = useMemo(() => {
    let filtered = state.counts;
    if (warehouseFilter !== "all") {
      filtered = filtered.filter(c => c.warehouseLocalId === warehouseFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.productLocalId.toLowerCase().includes(q) ||
        c.reason?.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [state.counts, warehouseFilter, searchQuery]);

  const filteredLots = useMemo(() => {
    let filtered = state.lots;
    if (warehouseFilter !== "all") {
      filtered = filtered.filter(l => l.warehouseLocalId === warehouseFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(l => 
        l.productLocalId.toLowerCase().includes(q) ||
        l.sourceType.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [state.lots, warehouseFilter, searchQuery]);

  const stockBalanceData = useMemo(() => {
    const balances: { productLocalId: string; warehouseLocalId: string; qty: number }[] = [];
    const keys = Object.keys(state.balances);
    for (const key of keys) {
      const [productId, warehouseId] = key.split(":");
      if (productId && warehouseId) {
        balances.push({
          productLocalId: productId,
          warehouseLocalId: warehouseId,
          qty: state.balances[key] ?? 0
        });
      }
    }
    let filtered = balances;
    if (warehouseFilter !== "all") {
      filtered = filtered.filter(b => b.warehouseLocalId === warehouseFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(b => b.productLocalId.toLowerCase().includes(q));
    }
    return filtered;
  }, [state.balances, warehouseFilter, searchQuery]);

  const defaultWarehouse = useMemo(() => 
    state.warehouses.find(w => w.isDefault === true),
    [state.warehouses]
  );

  const lastCount = useMemo(() => {
    const posted = state.counts.filter(c => c.status === "posted");
    if (posted.length === 0) return null;
    return posted.sort((a, b) => new Date(b.countedAt ?? b.createdAt).getTime() - new Date(a.countedAt ?? a.createdAt).getTime())[0];
  }, [state.counts]);

  const handleCreateMovement = async () => {
    if (!movementForm.productLocalId || !movementForm.warehouseLocalId) return;
    
    const product = products.find(p => p.localId === movementForm.productLocalId);
    const input: RecordStockMovementInput = {
      ...movementForm,
      isWeightedProduct: product?.isWeighted ?? false
    };
    
    await recordStockMovement(input);
    setShowMovementModal(false);
    setMovementForm({
      productLocalId: "",
      warehouseLocalId: "",
      movementType: "purchase_in",
      quantity: 1,
      notes: "",
      isWeightedProduct: false
    });
  };

  const handleCreateCount = async () => {
    if (!countForm.productLocalId || !countForm.warehouseLocalId) return;
    await createInventoryCount(countForm);
    setShowCountModal(false);
    setCountForm({
      productLocalId: "",
      warehouseLocalId: "",
      countedQty: 0,
      reason: ""
    });
  };

  const handleCreateWarehouse = async () => {
    if (!warehouseForm.name.trim()) return;
    
    if (warehouseForm.isDefault && defaultWarehouse) {
      await createWarehouse({ ...warehouseForm, isDefault: false });
    } else {
      await createWarehouse(warehouseForm);
    }
    setShowWarehouseModal(false);
    setWarehouseForm({
      name: "",
      code: "",
      address: "",
      isDefault: false
    });
  };

  const handlePostCount = async (localId: string) => {
    await postInventoryCount(localId);
  };

  const kpiHeader = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="card p-4 flex items-center gap-4">
        <div className="p-3 bg-brand-100 rounded-xl">
          <span className="block w-6 h-6 text-brand-600">💵</span>
        </div>
        <div>
          <p className="text-xs text-content-tertiary uppercase tracking-wide">Total Valorizado</p>
          <p className="text-xl font-bold text-content-primary">$0.00</p>
        </div>
      </div>
      <div className="card p-4 flex items-center gap-4">
        <div className="p-3 bg-state-warning/10 rounded-xl">
          <span className="block w-6 h-6 text-state-warning">⚠️</span>
        </div>
        <div>
          <p className="text-xs text-content-tertiary uppercase tracking-wide">Stock Crítico</p>
          <p className="text-xl font-bold text-content-primary">0</p>
        </div>
      </div>
      <div className="card p-4 flex items-center gap-4">
        <div className="p-3 bg-state-info/10 rounded-xl">
          <span className="block w-6 h-6 text-state-info">🕐</span>
        </div>
        <div>
          <p className="text-xs text-content-tertiary uppercase tracking-wide">Último Conteo</p>
          <p className="text-xl font-bold text-content-primary">
            {lastCount ? new Date(lastCount.countedAt ?? lastCount.createdAt).toLocaleDateString() : "N/A"}
          </p>
        </div>
      </div>
    </div>
  );

  const stockTab = (
    <div className="space-y-4">
      {kpiHeader}
      
      <div className="flex gap-4 flex-wrap">
        <SearchInput 
          placeholder="Buscar producto..." 
          value={searchQuery}
          onChange={setSearchQuery}
          className="max-w-xs"
        />
        <select 
          value={warehouseFilter}
          onChange={(e) => setWarehouseFilter(e.target.value)}
          className="input max-w-xs"
        >
          <option value="all">Todas las bodegas</option>
          {state.warehouses.map(w => (
            <option key={w.localId} value={w.localId}>{w.name}</option>
          ))}
        </select>
      </div>

      {stockBalanceData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <h3 className="text-lg font-semibold text-content-primary mb-1">Sin existencias</h3>
          <p className="text-sm text-content-secondary mb-4 max-w-sm">No hay productos en stock. Registra un movimiento de entrada.</p>
        </div>
      ) : (
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
              {stockBalanceData.map((item, idx) => {
                const product = products.find(p => p.localId === item.productLocalId);
                const warehouse = state.warehouses.find(w => w.localId === item.warehouseLocalId);
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
      )}
    </div>
  );

  const movementsTab = (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-4 flex-wrap">
          <SearchInput 
            placeholder="Buscar movimiento..." 
            value={searchQuery}
            onChange={setSearchQuery}
            className="max-w-xs"
          />
          <select 
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="input max-w-xs"
          >
            <option value="all">Todas las bodegas</option>
            {state.warehouses.map(w => (
              <option key={w.localId} value={w.localId}>{w.name}</option>
            ))}
          </select>
        </div>
        <button 
          onClick={() => setShowMovementModal(true)}
          className="btn btn-primary"
        >
          <Plus className="w-4 h-4" />
          Registrar Movimiento
        </button>
      </div>

      {filteredMovements.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <h3 className="text-lg font-semibold text-content-primary mb-1">Sin movimientos</h3>
          <p className="text-sm text-content-secondary mb-4 max-w-sm">No hay movimientos de stock registrados.</p>
        </div>
      ) : (
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
              {filteredMovements.slice(-20).reverse().map((m) => {
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
                      {state.warehouses.find(w => w.localId === m.warehouseLocalId)?.name ?? m.warehouseLocalId}
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
      )}
    </div>
  );

  const countsTab = (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-4 flex-wrap">
          <SearchInput 
            placeholder="Buscar conteo..." 
            value={searchQuery}
            onChange={setSearchQuery}
            className="max-w-xs"
          />
          <select 
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="input max-w-xs"
          >
            <option value="all">Todas las bodegas</option>
            {state.warehouses.map(w => (
              <option key={w.localId} value={w.localId}>{w.name}</option>
            ))}
          </select>
        </div>
        <button 
          onClick={() => setShowCountModal(true)}
          className="btn btn-primary"
        >
          <Plus className="w-4 h-4" />
          Nuevo Conteo
        </button>
      </div>

      {filteredCounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <h3 className="text-lg font-semibold text-content-primary mb-1">Sin conteos</h3>
          <p className="text-sm text-content-secondary mb-4 max-w-sm">No hay conteos de inventario registrados.</p>
        </div>
      ) : (
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
              {filteredCounts.slice(-20).reverse().map((c) => {
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
                      {state.warehouses.find(w => w.localId === c.warehouseLocalId)?.name ?? c.warehouseLocalId}
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
                        <button 
                          onClick={() => handlePostCount(c.localId)}
                          className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                        >
                          Publicar
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

  const warehousesTab = (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button 
          onClick={() => setShowWarehouseModal(true)}
          className="btn btn-primary"
        >
          <Plus className="w-4 h-4" />
          Nueva Bodega
        </button>
      </div>

      {state.warehouses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <h3 className="text-lg font-semibold text-content-primary mb-1">Sin bodegas</h3>
          <p className="text-sm text-content-secondary mb-4 max-w-sm">No hay almacenes registrados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {state.warehouses.map((w) => (
            <div key={w.localId} className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-content-primary">{w.name}</h3>
                  {w.code && <p className="text-sm text-content-secondary">{w.code}</p>}
                  {w.address && <p className="text-sm text-content-tertiary">{w.address}</p>}
                </div>
                {w.isDefault && (
                  <Badge variant="success">Principal</Badge>
                )}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${w.isActive ? "bg-state-success" : "bg-surface-400"}`} />
                <span className="text-sm text-content-secondary">{w.isActive ? "Activa" : "Inactiva"}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const lotsTab = (
    <div className="space-y-4">
      <div className="flex gap-4 flex-wrap">
        <SearchInput 
          placeholder="Buscar lote..." 
          value={searchQuery}
          onChange={setSearchQuery}
          className="max-w-xs"
        />
        <select 
          value={warehouseFilter}
          onChange={(e) => setWarehouseFilter(e.target.value)}
          className="input max-w-xs"
        >
          <option value="all">Todas las bodegas</option>
          {state.warehouses.map(w => (
            <option key={w.localId} value={w.localId}>{w.name}</option>
          ))}
        </select>
      </div>

      {filteredLots.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <h3 className="text-lg font-semibold text-content-primary mb-1">Sin lotes</h3>
          <p className="text-sm text-content-secondary mb-4 max-w-sm">No hay capas de costo FIFO activas.</p>
        </div>
      ) : (
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
              {filteredLots.map((lot) => {
                const product = products.find(p => p.localId === lot.productLocalId);
                const age = Math.floor((Date.now() - new Date(lot.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <tr key={lot.localId} className="hover:bg-surface-50">
                    <td className="px-4 py-3 text-sm font-mono">{lot.localId.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-sm">{product?.name ?? lot.productLocalId}</td>
                    <td className="px-4 py-3 text-sm">
                      {state.warehouses.find(w => w.localId === lot.warehouseLocalId)?.name ?? lot.warehouseLocalId}
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
      )}
    </div>
  );

  const tabs: TabItem[] = [
    { id: "stock", label: "Existencias", content: stockTab },
    { id: "movements", label: "Movimientos", content: movementsTab },
    { id: "counts", label: "Conteos", content: countsTab },
    { id: "warehouses", label: "Bodegas", content: warehousesTab },
    { id: "lots", label: "Lotes (FIFO)", content: lotsTab }
  ];

  return (
    <section className="p-6">
      {state.lastError && (
        <div className="mb-4 p-3 bg-state-error/10 border border-state-error/20 rounded-lg text-state-error text-sm">
          {state.lastError.message}
        </div>
      )}

      {state.isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : (
        <Tabs 
          items={tabs} 
          defaultTab="stock"
          onChange={setActiveTab}
          variant="underline"
        />
      )}

      {/* Modal: Registrar Movimiento */}
      <Modal
        isOpen={showMovementModal}
        onClose={() => setShowMovementModal(false)}
        title="Registrar Movimiento de Stock"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Producto *</label>
            <select 
              value={movementForm.productLocalId}
              onChange={(e) => setMovementForm(f => ({ ...f, productLocalId: e.target.value }))}
              className="input"
            >
              <option value="">Seleccionar producto</option>
              {products.map(p => (
                <option key={p.localId} value={p.localId}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Bodega *</label>
            <select 
              value={movementForm.warehouseLocalId}
              onChange={(e) => setMovementForm(f => ({ ...f, warehouseLocalId: e.target.value }))}
              className="input"
            >
              <option value="">Seleccionar bodega</option>
              {state.warehouses.map(w => (
                <option key={w.localId} value={w.localId}>{w.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Tipo de Movimiento *</label>
            <select 
              value={movementForm.movementType}
              onChange={(e) => setMovementForm(f => ({ ...f, movementType: e.target.value as StockMovementType }))}
              className="input"
            >
              {Object.entries(movementTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Cantidad *</label>
            <input 
              type="number"
              step="0.0001"
              min="0.0001"
              value={movementForm.quantity}
              onChange={(e) => setMovementForm(f => ({ ...f, quantity: Number(e.target.value) }))}
              className="input"
            />
          </div>
          <div>
            <label className="label">Notas (obligatorio para ajustes)</label>
            <textarea 
              value={movementForm.notes}
              onChange={(e) => setMovementForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Motivo del movimiento..."
              className="input min-h-[80px]"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button 
              onClick={() => setShowMovementModal(false)}
              className="btn btn-secondary"
            >
              Cancelar
            </button>
            <button 
              onClick={handleCreateMovement}
              disabled={!movementForm.productLocalId || !movementForm.warehouseLocalId}
              className="btn btn-primary"
            >
              Registrar
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Nuevo Conteo */}
      <Modal
        isOpen={showCountModal}
        onClose={() => setShowCountModal(false)}
        title="Nuevo Conteo de Inventario"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Producto *</label>
            <select 
              value={countForm.productLocalId}
              onChange={(e) => setCountForm(f => ({ ...f, productLocalId: e.target.value }))}
              className="input"
            >
              <option value="">Seleccionar producto</option>
              {products.map(p => (
                <option key={p.localId} value={p.localId}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Bodega *</label>
            <select 
              value={countForm.warehouseLocalId}
              onChange={(e) => setCountForm(f => ({ ...f, warehouseLocalId: e.target.value }))}
              className="input"
            >
              <option value="">Seleccionar bodega</option>
              {state.warehouses.map(w => (
                <option key={w.localId} value={w.localId}>{w.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Cantidad Contada *</label>
            <input 
              type="number"
              step="0.0001"
              min="0"
              value={countForm.countedQty}
              onChange={(e) => setCountForm(f => ({ ...f, countedQty: Number(e.target.value) }))}
              className="input"
            />
          </div>
          <div>
            <label className="label">Razón / Observación</label>
            <textarea 
              value={countForm.reason}
              onChange={(e) => setCountForm(f => ({ ...f, reason: e.target.value }))}
              placeholder="Motivo del conteo..."
              className="input min-h-[80px]"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button 
              onClick={() => setShowCountModal(false)}
              className="btn btn-secondary"
            >
              Cancelar
            </button>
            <button 
              onClick={handleCreateCount}
              disabled={!countForm.productLocalId || !countForm.warehouseLocalId}
              className="btn btn-primary"
            >
              Crear Conteo
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Nueva Bodega */}
      <Modal
        isOpen={showWarehouseModal}
        onClose={() => setShowWarehouseModal(false)}
        title="Nueva Bodega"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Nombre *</label>
            <input 
              value={warehouseForm.name}
              onChange={(e) => setWarehouseForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Nombre de la bodega"
              className="input"
            />
          </div>
          <div>
            <label className="label">Código</label>
            <input 
              value={warehouseForm.code}
              onChange={(e) => setWarehouseForm(f => ({ ...f, code: e.target.value }))}
              placeholder="Código identificador"
              className="input"
            />
          </div>
          <div>
            <label className="label">Dirección</label>
            <input 
              value={warehouseForm.address}
              onChange={(e) => setWarehouseForm(f => ({ ...f, address: e.target.value }))}
              placeholder="Dirección de la bodega"
              className="input"
            />
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="checkbox"
              id="isDefault"
              checked={warehouseForm.isDefault}
              onChange={(e) => setWarehouseForm(f => ({ ...f, isDefault: e.target.checked }))}
              className="w-4 h-4"
            />
            <label htmlFor="isDefault" className="text-sm text-content-secondary">
              Bodega Principal (predeterminada)
            </label>
          </div>
          <div className="flex justify-end gap-3">
            <button 
              onClick={() => setShowWarehouseModal(false)}
              className="btn btn-secondary"
            >
              Cancelar
            </button>
            <button 
              onClick={handleCreateWarehouse}
              disabled={!warehouseForm.name.trim()}
              className="btn btn-primary"
            >
              Crear Bodega
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
