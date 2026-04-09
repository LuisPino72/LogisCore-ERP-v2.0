/**
 * Centro de Gestión de Compras - LogisCore ERP v2.0
 * 
 * Diseño de "Panel Maestro" con navegación de 2 niveles:
 * - Nivel 1: Gestión de Órdenes | Catálogo y Proveedores
 * - Nivel 2 (Órdenes): Órdenes de Compra | Recepciones
 * - Nivel 2 (Catálogo): Productos | Categorías | Presentaciones | Proveedores
 * 
 * Características:
 * - KPI Header: Total Comprado (Mes), Órdenes Pendientes, Proveedores Activos
 * - Badges de estado para órdenes (draft/confirmed/received/cancelled)
 * - Regla de recepción: Solo si estado ∈ {draft, confirmed, partial_received}
 * - Decimales: toFixed(4) para productos pesables
 */

import { useEffect, useMemo, useState, useCallback } from "react";
import { Plus, Search, Check, X, Edit2, FileText, Users } from "lucide-react";
import type { Product, Category, ProductPresentation } from "@/features/products/types/products.types";
import type { Warehouse } from "@/features/inventory/types/inventory.types";
import { eventBus } from "@/lib/core/runtime";
import { usePurchases } from "../hooks/usePurchases";
import { purchasesService } from "../services/purchases.service.instance";
import { PurchasesCatalogPanel } from "./PurchasesCatalogPanel";
import { Badge } from "@/common/components/Badge";
import { Modal } from "@/common/components/Modal";
import { LoadingSpinner } from "@/common/components/EmptyState";
import { Tabs, type TabItem } from "@/common/components/Tabs";
import { useKeyboardShortcuts } from "@/common";
import type { PurchaseItem, PurchasesActorContext, PurchasesTenantContext, ReceivePurchaseInput } from "../types/purchases.types";

interface PurchasesPanelProps {
  tenantSlug: string;
  actor: PurchasesActorContext;
  products: Product[];
  categories?: Category[];
  presentations?: ProductPresentation[];
  warehouses?: Warehouse[];
  onSetPreferredSupplier?: (productLocalId: string, supplierLocalId: string | null) => void;
}

const statusLabels: Record<string, string> = {
  draft: "Borrador",
  confirmed: "Confirmada",
  partial_received: "Recepción Parcial",
  received: "Recibida",
  cancelled: "Anulada"
};

const statusVariants: Record<string, "default" | "warning" | "success" | "error" | "info"> = {
  draft: "default",
  confirmed: "info",
  partial_received: "warning",
  received: "success",
  cancelled: "error"
};

function formatQty(qty: number, isWeighted?: boolean | null): string {
  return (isWeighted ?? false) ? qty.toFixed(4) : qty.toFixed(2);
}

export function PurchasesPanel({ 
  tenantSlug, 
  actor, 
  products, 
  categories = [], 
  presentations = [],
  warehouses, 
  onSetPreferredSupplier: _onSetPreferredSupplier 
}: PurchasesPanelProps) {
  void _onSetPreferredSupplier;
  
  // Nivel 1: main tabs
  const [activeMainTab, setActiveMainTab] = useState<"orders" | "catalog">("orders");
  // Nivel 2: sub tabs (only for orders)
  const [ordersSubTab, setOrdersSubTab] = useState<"orders-list" | "receivings">("orders-list");
  
  // Form states
  const [warehouseLocalId, setWarehouseLocalId] = useState("");
  const [supplierLocalId, setSupplierLocalId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [productLocalId, setProductLocalId] = useState("");
  const [qty, setQty] = useState("1");
  const [unitCost, setUnitCost] = useState("0");
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal states
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);
  const [editItems, setEditItems] = useState<PurchaseItem[]>([]);
  const [receivingPurchaseId, setReceivingPurchaseId] = useState<string | null>(null);
  const [receiveForm, setReceiveForm] = useState<{ productLocalId: string; qty: number }[]>([]);

  const tenant: PurchasesTenantContext = { tenantSlug };
  
  const { state: purchasesState, refresh: refreshPurchases, createPurchase, receivePurchase, confirmPurchase, cancelPurchase, editPurchase, createSupplier, updateSupplier } = usePurchases({
    service: purchasesService,
    tenant,
    actor
  });

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const focusFirstInput = useCallback(() => {
    const warehouseSelect = document.querySelector('[data-warehouse-select]') as HTMLSelectElement;
    if (warehouseSelect) warehouseSelect.focus();
  }, []);

  const handleStartNewPurchase = useCallback(() => {
    scrollToTop();
    setTimeout(focusFirstInput, 100);
  }, [scrollToTop, focusFirstInput]);

  useKeyboardShortcuts([
    { key: "n", ctrl: true, handler: handleStartNewPurchase, description: "Nueva orden de compra" },
    { key: "b", ctrl: true, handler: scrollToTop, description: "Ir al inicio" },
  ]);

  useEffect(() => {
    void refreshPurchases();
  }, [refreshPurchases]);

  useEffect(() => {
    const offCreated = eventBus.on("PURCHASES.CREATED", () => void refreshPurchases());
    const offReceived = eventBus.on("PURCHASES.RECEIVED", () => void refreshPurchases());
    const offConfirmed = eventBus.on("PURCHASES.CONFIRMED", () => void refreshPurchases());
    const offCancelled = eventBus.on("PURCHASES.CANCELLED", () => void refreshPurchases());
    const offUpdated = eventBus.on("PURCHASES.UPDATED", () => void refreshPurchases());
    return () => {
      offCreated();
      offReceived();
      offConfirmed();
      offCancelled();
      offUpdated();
    };
  }, [refreshPurchases]);

  const total = useMemo(() => items.reduce((acc, item) => acc + item.qty * item.unitCost, 0), [items]);

  // KPI Calculations
  const kpiData = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Total Comprado (Mes): Solo órdenes received filtradas por mes de receivedAt
    const totalCompradoMes = purchasesState.purchases
      .filter(p => {
        if (p.status !== "received" || !p.receivedAt) return false;
        const receivedDate = new Date(p.receivedAt);
        return receivedDate >= startOfMonth && receivedDate <= now;
      })
      .reduce((sum, p) => sum + p.total, 0);

    // Órdenes Pendientes
    const ordenesPendientes = purchasesState.purchases
      .filter(p => ["draft", "confirmed", "partial_received"].includes(p.status))
      .length;

    // Proveedores Activos
    const proveedoresActivos = purchasesState.suppliers
      .filter(s => s.isActive)
      .length;

    return {
      totalCompradoMes,
      ordenesPendientes,
      proveedoresActivos
    };
  }, [purchasesState.purchases, purchasesState.suppliers]);

  const filteredPurchases = useMemo(() => {
    if (!searchQuery) return purchasesState.purchases;
    const q = searchQuery.toLowerCase();
    return purchasesState.purchases.filter(p => 
      p.localId.toLowerCase().includes(q) ||
      p.supplierName?.toLowerCase().includes(q) ||
      p.warehouseLocalId.toLowerCase().includes(q)
    );
  }, [purchasesState.purchases, searchQuery]);

  const handleAddItem = () => {
    if (!productLocalId) return;
    const product = products.find(p => p.localId === productLocalId);
    const isWeighted = product?.isWeighted ?? false;
    setItems((previous) => [
      ...previous, 
      { productLocalId, qty: Number(isWeighted ? Number(qty).toFixed(4) : qty), unitCost: Number(unitCost) }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((previous) => previous.filter((_, i) => i !== index));
  };

  const handleCreatePurchase = async () => {
    const input: { warehouseLocalId: string; supplierLocalId?: string; supplierName?: string; items: PurchaseItem[] } = {
      warehouseLocalId,
      items
    };
    if (supplierLocalId) {
      input.supplierLocalId = supplierLocalId;
    } else if (supplierName.trim()) {
      input.supplierName = supplierName.trim();
    }
    
    const created = await createPurchase(input);
    if (created) {
      setItems([]);
      setSupplierLocalId("");
      setSupplierName("");
      setWarehouseLocalId("");
    }
  };

  const canReceive = (status: string): boolean => {
    return ["draft", "confirmed", "partial_received"].includes(status);
  };

  const handleStartReceiving = (purchase: { localId: string; status: string; items: PurchaseItem[] }) => {
    if (!canReceive(purchase.status)) return;
    setReceivingPurchaseId(purchase.localId);
    setReceiveForm(purchase.items.map(item => ({
      productLocalId: item.productLocalId,
      qty: item.qty
    })));
  };

  const handleCancelReceiving = () => {
    setReceivingPurchaseId(null);
    setReceiveForm([]);
  };

  const handleConfirmReceive = async () => {
    if (!receivingPurchaseId) return;
    const input: ReceivePurchaseInput = {
      purchaseLocalId: receivingPurchaseId,
      receivedItems: receiveForm
    };
    const result = await receivePurchase(input);
    if (result) {
      setReceivingPurchaseId(null);
      setReceiveForm([]);
    }
  };

  const handleConfirmPurchase = async (purchaseLocalId: string) => {
    await confirmPurchase(purchaseLocalId);
  };

  const handleCancelPurchase = async (purchaseLocalId: string) => {
    await cancelPurchase(purchaseLocalId);
  };

  const handleStartEdit = (purchase: { localId: string; items: PurchaseItem[] }) => {
    setEditingPurchaseId(purchase.localId);
    setEditItems([...purchase.items]);
  };

  const handleCancelEdit = () => {
    setEditingPurchaseId(null);
    setEditItems([]);
  };

  const handleSaveEdit = async () => {
    if (!editingPurchaseId) return;
    const result = await editPurchase({ purchaseLocalId: editingPurchaseId, items: editItems });
    if (result) {
      setEditingPurchaseId(null);
      setEditItems([]);
    }
  };

  const handleEditAddItem = () => {
    if (!productLocalId) return;
    setEditItems((prev) => [
      ...prev,
      { productLocalId, qty: Number(qty), unitCost: Number(unitCost) }
    ]);
  };

  const handleEditRemoveItem = (index: number) => {
    setEditItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEditUpdateQty = (index: number, qty: number) => {
    setEditItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index]!, qty };
      return copy;
    });
  };

  const handleEditUpdateUnitCost = (index: number, unitCost: number) => {
    setEditItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index]!, unitCost };
      return copy;
    });
  };

  // KPI Header Component
  const kpiHeader = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="card p-4 flex items-center gap-4">
        <div className="p-3 bg-brand-100 rounded-xl">
          <span className="block w-6 h-6 text-center">💰</span>
        </div>
        <div>
          <p className="text-xs text-content-tertiary uppercase tracking-wide">Total Comprado (Mes)</p>
          <p className="text-xl font-bold text-content-primary">${kpiData.totalCompradoMes.toFixed(2)}</p>
        </div>
      </div>
      <div className="card p-4 flex items-center gap-4">
        <div className="p-3 bg-state-warning/10 rounded-xl">
          <span className="block w-6 h-6 text-center">📋</span>
        </div>
        <div>
          <p className="text-xs text-content-tertiary uppercase tracking-wide">Órdenes Pendientes</p>
          <p className="text-xl font-bold text-content-primary">{kpiData.ordenesPendientes}</p>
        </div>
      </div>
      <div className="card p-4 flex items-center gap-4">
        <div className="p-3 bg-state-info/10 rounded-xl">
          <span className="block w-6 h-6 text-center">🏢</span>
        </div>
        <div>
          <p className="text-xs text-content-tertiary uppercase tracking-wide">Proveedores Activos</p>
          <p className="text-xl font-bold text-content-primary">{kpiData.proveedoresActivos}</p>
        </div>
      </div>
    </div>
  );

  // Orders List Tab Content
  const OrdersListTabContent = () => (
    <div className="space-y-6">
      {/* New Purchase Form */}
      <div className="card">
        <div className="card-body">
          <h3 className="card-title mb-4">Nueva Orden de Compra</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="label">Bodega *</label>
              <select
                data-warehouse-select
                value={warehouseLocalId}
                onChange={(e) => setWarehouseLocalId(e.target.value)}
                className="input"
              >
                <option value="">Seleccionar bodega</option>
                {warehouses?.map((wh) => (
                  <option key={wh.localId} value={wh.localId}>{wh.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-content-secondary mb-1">Proveedor</label>
              <select
                value={supplierLocalId}
                onChange={(e) => { setSupplierLocalId(e.target.value); setSupplierName(""); }}
                className="input"
              >
                <option value="">Seleccionar proveedor</option>
                {purchasesState.suppliers.filter(s => s.isActive).map((sup) => (
                  <option key={sup.localId} value={sup.localId}>{sup.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-content-secondary mb-1">O nombre manual</label>
              <input
                value={supplierName}
                onChange={(e) => { setSupplierName(e.target.value); if (e.target.value) setSupplierLocalId(""); }}
                placeholder="Nombre del proveedor"
                className="input"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-content-secondary mb-1">Producto</label>
              <select value={productLocalId} onChange={(e) => setProductLocalId(e.target.value)} className="input">
                <option value="">Seleccionar producto</option>
                {products.map((product) => (
                  <option key={product.localId} value={product.localId}>{product.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-content-secondary mb-1">Cantidad</label>
              <input
                type="number"
                min="0.0001"
                step="0.0001"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-content-secondary mb-1">Costo Unit.</label>
              <input
                type="number"
                min="0"
                step="0.0001"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                className="input"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleAddItem}
                disabled={!productLocalId}
                className="btn btn-secondary w-full"
              >
                <Plus className="w-4 h-4" /> Agregar
              </button>
            </div>
          </div>

          {items.length > 0 && (
            <div className="mb-4">
              <div className="text-sm font-medium text-content-secondary mb-2">Items en la orden:</div>
              <div className="space-y-1">
                {items.map((item, index) => {
                  const product = products.find(p => p.localId === item.productLocalId);
                  return (
                    <div key={index} className="flex items-center justify-between bg-surface-50 px-3 py-2 rounded border border-surface-200">
                      <span className="text-sm text-content-primary">{product?.name || item.productLocalId}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-content-secondary font-mono">
                          {formatQty(item.qty, product?.isWeighted)} x ${item.unitCost.toFixed(2)}
                        </span>
                        <button onClick={() => handleRemoveItem(index)} className="text-state-error hover:text-state-error text-xs">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 text-right font-medium text-content-primary">
                Total: ${total.toFixed(2)}
              </div>
            </div>
          )}

          <button
            type="button"
            disabled={purchasesState.isSubmitting || !warehouseLocalId || items.length === 0}
            onClick={handleCreatePurchase}
            className="btn btn-primary w-full"
          >
            {purchasesState.isSubmitting ? <LoadingSpinner size="sm" /> : <><Check className="w-4 h-4" /> Crear Orden de Compra</>}
          </button>
        </div>
      </div>

      {/* Purchases List */}
      <div className="card">
        <div className="card-body">
          <h3 className="card-title mb-4">Órdenes de Compra</h3>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-tertiary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar órdenes..."
              className="input pl-10"
            />
          </div>

          {filteredPurchases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <h3 className="text-lg font-semibold text-content-primary mb-1">No hay órdenes de compra</h3>
              <p className="text-sm text-content-secondary mb-4 max-w-sm">Crea tu primera orden de compra</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPurchases.map((purchase) => {
                const supplier = purchasesState.suppliers.find(s => s.localId === purchase.supplierLocalId);
                const warehouse = warehouses?.find(w => w.localId === purchase.warehouseLocalId);
                
                return (
                  <div key={purchase.localId} className="flex items-center justify-between bg-surface-50 rounded-lg border border-surface-200 p-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-content-tertiary">{purchase.localId.slice(0, 8)}</span>
                        <Badge variant={statusVariants[purchase.status] ?? "default"}>
                          {statusLabels[purchase.status] ?? purchase.status}
                        </Badge>
                      </div>
                      <div className="text-sm font-medium text-content-primary">
                        {supplier?.name || purchase.supplierName || "Sin proveedor"}
                      </div>
                      <div className="text-xs text-content-secondary">
                        Bodega: {warehouse?.name || purchase.warehouseLocalId} · Items: {purchase.items.length} · Total: ${purchase.total.toFixed(2)}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {purchase.status === "draft" && (
                        <>
                          <button onClick={() => handleConfirmPurchase(purchase.localId)} className="btn btn-sm btn-secondary">
                            Confirmar
                          </button>
                          <button onClick={() => handleStartEdit(purchase)} className="btn btn-sm btn-ghost">
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button onClick={() => handleCancelPurchase(purchase.localId)} className="btn btn-sm btn-ghost text-state-error">
                            <X className="w-3 h-3" />
                          </button>
                        </>
                      )}
                      {canReceive(purchase.status) && (
                        <button onClick={() => handleStartReceiving(purchase)} className="btn btn-sm btn-primary">
                          Recepcionar
                        </button>
                      )}
                      {purchase.status === "partial_received" && (
                        <>
                          <button onClick={() => handleStartReceiving(purchase)} className="btn btn-sm btn-secondary">
                            Completar
                          </button>
                          <button onClick={() => handleCancelPurchase(purchase.localId)} className="btn btn-sm btn-ghost text-state-error">
                            Anular
                          </button>
                        </>
                      )}
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

  // Receivings Tab Content
  const ReceivingsTabContent = () => (
    <div className="card">
      <div className="card-body">
        <h3 className="card-title mb-4">Recepciones</h3>
        
        {purchasesState.receivings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <h3 className="text-lg font-semibold text-content-primary mb-1">No hay recepciones</h3>
            <p className="text-sm text-content-secondary mb-4 max-w-sm">Las recepciones aparecerán aquí cuando recibas órdenes de compra</p>
          </div>
        ) : (
          <div className="space-y-2">
            {purchasesState.receivings.map((receiving) => (
              <div key={receiving.localId} className="flex items-center justify-between bg-surface-50 rounded-lg border border-surface-200 p-3">
                <div>
                  <span className="font-mono text-xs text-content-tertiary">{receiving.localId.slice(0, 8)}</span>
                  <span className="ml-2 text-sm text-content-secondary">
                    → {receiving.purchaseLocalId.slice(0, 8)}
                  </span>
                </div>
                <span className="text-sm font-medium text-content-primary">
                  ${receiving.totalCost.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Orders Sub Tabs
  const ordersSubTabs: TabItem[] = [
    { id: "orders-list", label: "Órdenes de Compra", content: <OrdersListTabContent /> },
    { id: "receivings", label: "Recepciones", content: <ReceivingsTabContent /> }
  ];

  // Catalog Content - Now unified
  const CatalogTabContent = () => (
    <PurchasesCatalogPanel 
      tenantSlug={tenantSlug} 
      actor={actor} 
      categories={categories} 
      products={products} 
      presentations={presentations} 
      suppliers={purchasesState.suppliers}
      onCreateSupplier={createSupplier}
      onUpdateSupplier={updateSupplier}
      isLoadingSuppliers={purchasesState.isLoading}
    />
  );

  return (
    <section className="p-6">
      {kpiHeader}

      {/* Main Tabs - Level 1 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-1 bg-surface-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveMainTab("orders")}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${
              activeMainTab === "orders" ? "bg-white shadow-sm text-content-primary" : "text-content-tertiary hover:text-content-secondary"
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Gestión de Órdenes
          </button>
          <button
            onClick={() => setActiveMainTab("catalog")}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${
              activeMainTab === "catalog" ? "bg-white shadow-sm text-content-primary" : "text-content-tertiary hover:text-content-secondary"
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Gestión del Catálogo
          </button>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-content-tertiary">
          <span className="kbd">Ctrl</span>+<span className="kbd">N</span>
          <span className="hidden sm:inline">Nueva orden</span>
        </div>
      </div>

      {/* Content based on main tab */}
      {activeMainTab === "orders" ? (
        <Tabs 
          items={ordersSubTabs} 
          defaultTab={ordersSubTab} 
          onChange={(id) => setOrdersSubTab(id as typeof ordersSubTab)} 
          variant="underline" 
        />
      ) : (
        <CatalogTabContent />
      )}

      {/* Edit Purchase Modal */}
      <Modal
        isOpen={!!editingPurchaseId}
        onClose={handleCancelEdit}
        title="Editar Orden de Compra"
        size="lg"
        footer={
          <>
            <button onClick={handleCancelEdit} className="btn btn-secondary">Cancelar</button>
            <button onClick={handleSaveEdit} disabled={purchasesState.isSubmitting || editItems.length === 0} className="btn btn-primary">
              {purchasesState.isSubmitting ? <LoadingSpinner size="sm" /> : <><Check className="w-4 h-4" /> Guardar</>}
            </button>
          </>
        }
      >
        <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
          {editItems.map((item, index) => {
            const product = products.find(p => p.localId === item.productLocalId);
            return (
              <div key={index} className="flex items-center gap-2 bg-surface-50 rounded-lg p-2">
                <span className="flex-1 text-sm text-content-primary truncate">
                  {product?.name || item.productLocalId.slice(0, 8)}
                </span>
                <input
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  value={item.qty}
                  onChange={(e) => handleEditUpdateQty(index, Number(e.target.value))}
                  className="input w-20"
                />
                <input
                  type="number"
                  min="0"
                  step="0.0001"
                  value={item.unitCost}
                  onChange={(e) => handleEditUpdateUnitCost(index, Number(e.target.value))}
                  className="input w-24"
                />
                <button onClick={() => handleEditRemoveItem(index)} className="text-state-error">
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="col-span-2">
            <select value={productLocalId} onChange={(e) => setProductLocalId(e.target.value)} className="input">
              <option value="">Agregar producto</option>
              {products.map((p) => (<option key={p.localId} value={p.localId}>{p.name}</option>))}
            </select>
          </div>
          <input type="number" min="0.0001" step="0.0001" value={qty} onChange={(e) => setQty(e.target.value)} className="input" placeholder="Cant" />
          <button onClick={handleEditAddItem} disabled={!productLocalId} className="btn btn-secondary">
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="text-right text-sm font-medium text-content-primary">
          Total: ${editItems.reduce((acc, i) => acc + i.qty * i.unitCost, 0).toFixed(2)}
        </div>
      </Modal>

      {/* Receiving Modal */}
      <Modal
        isOpen={!!receivingPurchaseId}
        onClose={handleCancelReceiving}
        title="Recepcionar Compra"
        size="lg"
        footer={
          <>
            <button onClick={handleCancelReceiving} className="btn btn-secondary">Cancelar</button>
            <button onClick={handleConfirmReceive} disabled={purchasesState.isSubmitting} className="btn btn-primary">
              {purchasesState.isSubmitting ? <LoadingSpinner size="sm" /> : <><Check className="w-4 h-4" /> Confirmar</>}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          {receiveForm.map((item, index) => {
            const product = products.find(p => p.localId === item.productLocalId);
            const originalItem = purchasesState.purchases.find(p => p.localId === receivingPurchaseId)?.items.find(i => i.productLocalId === item.productLocalId);
            
            return (
              <div key={index} className="flex items-center gap-3">
                <span className="flex-1 text-sm text-content-primary">
                  {product?.name || item.productLocalId}
                </span>
                <span className="text-xs text-content-tertiary">
                  (ordenado: {originalItem?.qty || 0})
                </span>
                <input
                  type="number"
                  min="0"
                  max={originalItem?.qty || 0}
                  value={item.qty}
                  onChange={(e) => {
                    const newForm = [...receiveForm];
                    newForm[index] = { ...newForm[index]!, qty: Number(e.target.value) };
                    setReceiveForm(newForm);
                  }}
                  className="input w-20"
                />
              </div>
            );
          })}
        </div>
      </Modal>
    </section>
  );
}
