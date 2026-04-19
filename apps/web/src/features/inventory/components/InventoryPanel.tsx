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
import { LoadingSpinner } from "@/common/components/EmptyState";
import { Tabs, type TabItem } from "@/common/components/Tabs";
import { SearchInput } from "@/common/components/SearchInput";
import { Modal } from "@/common/components/Modal";
import { Button } from "@/common/components/Button";

import type { 
  InventoryActorContext, 
  InventoryTenantContext,
  CreateWarehouseInput,
  RecordStockMovementInput,
  CreateInventoryCountInput
} from "../types/inventory.types";
import type { Product } from "@/features/products/types/products.types";

import { MovementForm } from "./forms/MovementForm";
import { CountForm } from "./forms/CountForm";
import { WarehouseForm } from "./forms/WarehouseForm";
import { InventoryKPIs } from "./InventoryKPIs";
import { StockTable } from "./StockTable";
import { MovementsTable } from "./MovementsTable";
import { CountsTable } from "./CountsTable";
import { WarehousesGrid } from "./WarehousesGrid";
import { LotsTable } from "./LotsTable";

interface InventoryPanelProps {
  tenantSlug: string;
  actor: InventoryActorContext;
  products: Product[];
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

  const filterControls = (
    <div className="flex gap-4 flex-wrap">
      <SearchInput 
        placeholder="Buscar..." 
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
  );

  const stockTab = (
    <div className="space-y-4">
      <InventoryKPIs 
        totalValue={0} 
        lowStockCount={0} 
        lastCount={lastCount} 
      />
      {filterControls}
      <StockTable 
        items={stockBalanceData} 
        products={products} 
        warehouses={state.warehouses} 
      />
    </div>
  );

  const movementsTab = (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        {filterControls}
        <Button variant="primary" onClick={() => setShowMovementModal(true)}>
          <Plus className="w-4 h-4" />
          Registrar Movimiento
        </Button>
      </div>
      <MovementsTable 
        movements={filteredMovements} 
        products={products} 
        warehouses={state.warehouses} 
      />
    </div>
  );

  const countsTab = (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        {filterControls}
        <Button variant="primary" onClick={() => setShowCountModal(true)}>
          <Plus className="w-4 h-4" />
          Nuevo Conteo
        </Button>
      </div>
      <CountsTable 
        counts={filteredCounts} 
        products={products} 
        warehouses={state.warehouses} 
        onPostCount={handlePostCount}
      />
    </div>
  );

  const warehousesTab = (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="primary" onClick={() => setShowWarehouseModal(true)}>
          <Plus className="w-4 h-4" />
          Nueva Bodega
        </Button>
      </div>
      <WarehousesGrid warehouses={state.warehouses} />
    </div>
  );

  const lotsTab = (
    <div className="space-y-4">
      {filterControls}
      <LotsTable 
        lots={filteredLots} 
        products={products} 
        warehouses={state.warehouses} 
      />
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

      <Modal
        isOpen={showMovementModal}
        onClose={() => setShowMovementModal(false)}
        title="Registrar Movimiento de Stock"
      >
        <MovementForm
          products={products}
          warehouses={state.warehouses}
          form={movementForm}
          onChange={setMovementForm}
          onSubmit={handleCreateMovement}
          onCancel={() => setShowMovementModal(false)}
        />
      </Modal>

      <Modal
        isOpen={showCountModal}
        onClose={() => setShowCountModal(false)}
        title="Nuevo Conteo de Inventario"
      >
        <CountForm
          products={products}
          warehouses={state.warehouses}
          form={countForm}
          onChange={setCountForm}
          onSubmit={handleCreateCount}
          onCancel={() => setShowCountModal(false)}
        />
      </Modal>

      <Modal
        isOpen={showWarehouseModal}
        onClose={() => setShowWarehouseModal(false)}
        title="Nueva Bodega"
      >
        <WarehouseForm
          form={warehouseForm}
          onChange={setWarehouseForm}
          onSubmit={handleCreateWarehouse}
          onCancel={() => setShowWarehouseModal(false)}
        />
      </Modal>
    </section>
  );
}