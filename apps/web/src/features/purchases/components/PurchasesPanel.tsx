/**
 * Componente principal del panel de compras.
 * Permite crear órdenes de compra, recibir compras y gestionar lotes de inventario.
 * Escucha eventos del bus para actualización automática.
 */

import { useEffect, useMemo, useState, useCallback } from "react";
import type { Product } from "@/features/products/types/products.types";
import type { Warehouse } from "@/features/inventory/types/inventory.types";
import { eventBus } from "@/lib/core/runtime";
import { usePurchases } from "../hooks/usePurchases";
import { purchasesService } from "../services/purchases.service.instance";
import { SuppliersPanel } from "./SuppliersPanel";
import { Badge } from "@/common/components/Badge";
import { useKeyboardShortcuts } from "@/common";
import type { PurchaseItem, PurchasesActorContext, PurchasesTenantContext, ReceivePurchaseInput } from "../types/purchases.types";

interface PurchasesPanelProps {
  tenantSlug: string;
  actor: PurchasesActorContext;
  products: Product[];
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

const statusVariants: Record<string, "default" | "warning" | "success" | "error"> = {
  draft: "default",
  confirmed: "warning",
  partial_received: "warning",
  received: "success",
  cancelled: "error"
};

export function PurchasesPanel({ tenantSlug, actor, products, warehouses, onSetPreferredSupplier }: PurchasesPanelProps) {
  const [activeSection, setActiveSection] = useState<"purchases" | "suppliers">("purchases");
  const [warehouseLocalId, setWarehouseLocalId] = useState("");
  const [supplierLocalId, setSupplierLocalId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [productLocalId, setProductLocalId] = useState("");
  const [qty, setQty] = useState("1");
  const [unitCost, setUnitCost] = useState("0");
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [receivingPurchaseId, setReceivingPurchaseId] = useState<string | null>(null);
  const [receiveForm, setReceiveForm] = useState<{ productLocalId: string; qty: number }[]>([]);
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);
  const [editItems, setEditItems] = useState<PurchaseItem[]>([]);

  const tenant: PurchasesTenantContext = { tenantSlug };
  
  const { state: purchasesState, refresh: refreshPurchases, createPurchase, receivePurchase, confirmPurchase, cancelPurchase, editPurchase, setProductPreferredSupplier } = usePurchases({
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
    { key: "b", ctrl: true, handler: scrollToTop, description: "Ir al inicio del formulario" },
  ]);

  useEffect(() => {
    void refreshPurchases();
  }, [refreshPurchases]);

  useEffect(() => {
    const offCreated = eventBus.on("PURCHASES.CREATED", () => {
      void refreshPurchases();
    });
    const offReceived = eventBus.on("PURCHASES.RECEIVED", () => {
      void refreshPurchases();
    });
    const offConfirmed = eventBus.on("PURCHASES.CONFIRMED", () => {
      void refreshPurchases();
    });
    const offCancelled = eventBus.on("PURCHASES.CANCELLED", () => {
      void refreshPurchases();
    });
    const offUpdated = eventBus.on("PURCHASES.UPDATED", () => {
      void refreshPurchases();
    });
    return () => {
      offCreated();
      offReceived();
      offConfirmed();
      offCancelled();
      offUpdated();
    };
  }, [refreshPurchases]);

  const total = useMemo(
    () => items.reduce((acc, item) => acc + item.qty * item.unitCost, 0),
    [items]
  );

  const handleAddItem = () => {
    if (!productLocalId) return;
    setItems((previous) => [
      ...previous,
      {
        productLocalId,
        qty: Number(qty),
        unitCost: Number(unitCost)
      }
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
    }
  };

  const handleStartReceiving = (purchase: { localId: string; items: PurchaseItem[] }) => {
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
      {
        productLocalId,
        qty: Number(qty),
        unitCost: Number(unitCost)
      }
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

  return (
    <div className="space-y-6">
      {/* Header con atajos */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-surface-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveSection("purchases")}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${
              activeSection === "purchases"
                ? "bg-white shadow-sm text-content-primary"
                : "text-content-tertiary hover:text-content-secondary"
            }`}
          >
            Compras
          </button>
          <button
            onClick={() => setActiveSection("suppliers")}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${
              activeSection === "suppliers"
                ? "bg-white shadow-sm text-content-primary"
                : "text-content-tertiary hover:text-content-secondary"
            }`}
          >
            Proveedores
          </button>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-content-tertiary">
          <span className="kbd">Ctrl</span>+<span className="kbd">N</span>
          <span className="hidden sm:inline">Nueva orden</span>
        </div>
      </div>

      {activeSection === "suppliers" ? (
        <SuppliersPanel tenantSlug={tenantSlug} actor={actor} />
      ) : (
        <div className="space-y-6">
          {/* Formulario de compra */}
          <section className="bg-surface-50 rounded-xl border border-surface-200 p-4">
            <h3 className="text-lg font-semibold text-content-primary mb-4">Nueva Orden de Compra</h3>
            
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
                    <option key={wh.localId} value={wh.localId}>
                      {wh.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-content-secondary mb-1">Proveedor</label>
                <select
                  value={supplierLocalId}
                  onChange={(e) => {
                    setSupplierLocalId(e.target.value);
                    setSupplierName("");
                  }}
                  className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm"
                >
                  <option value="">Seleccionar proveedor</option>
                  {purchasesState.suppliers.filter(s => s.isActive).map((sup) => (
                    <option key={sup.localId} value={sup.localId}>
                      {sup.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-content-secondary mb-1">O nombre manual</label>
                <input
                  value={supplierName}
                  onChange={(e) => {
                    setSupplierName(e.target.value);
                    if (e.target.value) setSupplierLocalId("");
                  }}
                  placeholder="Nombre del proveedor"
                  className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-content-secondary mb-1">Producto</label>
                <select
                  value={productLocalId}
                  onChange={(e) => setProductLocalId(e.target.value)}
                  className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm"
                >
                  <option value="">Seleccionar producto</option>
                  {products.map((product) => (
                    <option key={product.localId} value={product.localId}>
                      {product.name}
                    </option>
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
                  className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm"
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
                  className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm"
                />
              </div>
              
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleAddItem}
                  disabled={!productLocalId}
                  className="w-full px-3 py-2 bg-surface-200 text-content-primary rounded-lg hover:bg-surface-300 disabled:opacity-50 text-sm font-medium transition-colors"
                >
                  Agregar
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
                          <span className="text-sm text-content-secondary">
                            {item.qty} x ${item.unitCost.toFixed(2)}
                          </span>
                          <button
                            onClick={() => handleRemoveItem(index)}
                            className="text-state-error hover:text-state-error text-xs"
                          >
                            ✕
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
              className="w-full px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            >
              {purchasesState.isSubmitting ? "Creando..." : "Crear Orden de Compra"}
            </button>
          </section>

          {/* Proveedor preferido por producto */}
          <section className="bg-surface-50 rounded-xl border border-surface-200 p-4">
            <h3 className="text-lg font-semibold text-content-primary mb-4">Proveedor Preferido por Producto</h3>
            
            {products.length === 0 ? (
              <p className="text-content-tertiary text-center py-4">No hay productos</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {products.filter(p => !p.deletedAt).map((product) => {
                  const currentSupplier = purchasesState.suppliers.find(s => s.localId === product.preferredSupplierLocalId);
                  return (
                    <div key={product.localId} className="flex items-center justify-between bg-surface-50 rounded-lg border border-surface-200 p-2">
                      <span className="text-sm text-content-primary flex-1 truncate">{product.name}</span>
                      <select
                        value={product.preferredSupplierLocalId || ""}
                        onChange={async (e) => {
                          const val = e.target.value || null;
                          const success = await setProductPreferredSupplier(product.localId, val);
                          if (success && onSetPreferredSupplier) {
                            onSetPreferredSupplier(product.localId, val);
                          }
                        }}
                        className="ml-2 px-2 py-1 border border-surface-300 rounded text-sm max-w-48"
                      >
                        <option value="">Sin proveedor</option>
                        {purchasesState.suppliers.filter(s => s.isActive).map((sup) => (
                          <option key={sup.localId} value={sup.localId}>
                            {sup.name}
                          </option>
                        ))}
                      </select>
                      {currentSupplier && (
                        <span className="ml-2 text-xs text-content-tertiary">→ {currentSupplier.name}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Lista de compras */}
          <section className="bg-surface-50 rounded-xl border border-surface-200 p-4">
            <h3 className="text-lg font-semibold text-content-primary mb-4">Órdenes de Compra</h3>
            
            {purchasesState.purchases.length === 0 ? (
              <p className="text-content-tertiary text-center py-4">No hay órdenes de compra</p>
            ) : (
              <div className="space-y-2">
                {purchasesState.purchases.map((purchase) => {
                  const supplier = purchasesState.suppliers.find(s => s.localId === purchase.supplierLocalId);
                  const warehouse = warehouses?.find(w => w.localId === purchase.warehouseLocalId);
                  
                  return (
                    <div key={purchase.localId} className="bg-surface-50 rounded-lg border border-surface-200 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-mono text-xs text-content-tertiary">{purchase.localId.slice(0, 8)}</span>
                          <span className="ml-2 text-sm font-medium text-content-primary">
                            {supplier?.name || purchase.supplierName || "Sin proveedor"}
                          </span>
                        </div>
                        <Badge variant={statusVariants[purchase.status] ?? "default"}>
                          {statusLabels[purchase.status] ?? purchase.status}
                        </Badge>
                      </div>
                      
                      <div className="text-xs text-content-secondary mb-2">
                        Bodega: {warehouse?.name || purchase.warehouseLocalId} | 
                        Items: {purchase.items.length} | 
                        Total: ${purchase.total.toFixed(2)}
                      </div>
                      
                      <div className="flex gap-2 flex-wrap">
                        {purchase.status === "draft" && (
                          <>
                            <button
                              onClick={() => handleConfirmPurchase(purchase.localId)}
                              className="px-3 py-1.5 bg-amber-500 text-white text-xs rounded hover:bg-amber-600 transition-colors"
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => handleStartEdit(purchase)}
                              className="px-3 py-1.5 bg-surface-200 text-content-primary text-xs rounded hover:bg-surface-300 transition-colors"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleCancelPurchase(purchase.localId)}
                              className="px-3 py-1.5 bg-state-error text-white text-xs rounded hover:bg-state-error/80 transition-colors"
                            >
                              Anular
                            </button>
                          </>
                        )}
                        
                        {(purchase.status === "draft" || purchase.status === "confirmed") && (
                          <button
                            onClick={() => handleStartReceiving(purchase)}
                            className="px-3 py-1.5 bg-brand-500 text-white text-xs rounded hover:bg-brand-600 transition-colors"
                          >
                            Recepcionar
                          </button>
                        )}
                        
                        {purchase.status === "partial_received" && (
                          <>
                            <button
                              onClick={() => handleStartReceiving(purchase)}
                              className="px-3 py-1.5 bg-amber-500 text-white text-xs rounded hover:bg-amber-600 transition-colors"
                            >
                              Completar Recepción
                            </button>
                            <button
                              onClick={() => handleCancelPurchase(purchase.localId)}
                              className="px-3 py-1.5 bg-state-error text-white text-xs rounded hover:bg-state-error/80 transition-colors"
                            >
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
          </section>

          {/* Recepciones */}
          <section className="bg-surface-50 rounded-xl border border-surface-200 p-4">
            <h3 className="text-lg font-semibold text-content-primary mb-4">Recepciones</h3>
            
            {purchasesState.receivings.length === 0 ? (
              <p className="text-content-tertiary text-center py-4">No hay recepciones</p>
            ) : (
              <div className="space-y-2">
                {purchasesState.receivings.map((receiving) => (
                  <div key={receiving.localId} className="bg-surface-50 rounded-lg border border-surface-200 p-3">
                    <div className="flex items-center justify-between">
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
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Lotes de inventario */}
          <section className="bg-surface-50 rounded-xl border border-surface-200 p-4">
            <h3 className="text-lg font-semibold text-content-primary mb-4">Lotes de Inventario</h3>
            
            {purchasesState.inventoryLots.length === 0 ? (
              <p className="text-content-tertiary text-center py-4">No hay lotes</p>
            ) : (
              <div className="space-y-2">
                {purchasesState.inventoryLots.slice(0, 10).map((lot) => {
                  const product = products.find(p => p.localId === lot.productLocalId);
                  return (
                    <div key={lot.localId} className="bg-surface-50 rounded-lg border border-surface-200 p-3 flex items-center justify-between">
                      <div>
                        <span className="font-mono text-xs text-content-tertiary">{lot.localId.slice(0, 8)}</span>
                        <span className="ml-2 text-sm text-content-primary">
                          {product?.name || lot.productLocalId}
                        </span>
                      </div>
                      <span className="text-sm text-content-secondary">
                        Cant: {lot.quantity}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Modal de edición de compra draft */}
          {editingPurchaseId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/50" onClick={handleCancelEdit} />
              <div className="relative bg-surface-50 rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
                <h3 className="text-lg font-semibold text-content-primary mb-4">Editar Orden de Compra</h3>
                
                <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                  {editItems.map((item, index) => {
                    const product = products.find(p => p.localId === item.productLocalId);
                    return (
                      <div key={index} className="flex items-center gap-2 bg-surface-100 rounded-lg p-2">
                        <span className="flex-1 text-sm text-content-primary truncate">
                          {product?.name || item.productLocalId.slice(0, 8)}
                        </span>
                        <input
                          type="number"
                          min="0.0001"
                          step="0.0001"
                          value={item.qty}
                          onChange={(e) => handleEditUpdateQty(index, Number(e.target.value))}
                          className="w-20 px-2 py-1 border border-surface-300 rounded text-sm"
                          placeholder="Cant"
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.0001"
                          value={item.unitCost}
                          onChange={(e) => handleEditUpdateUnitCost(index, Number(e.target.value))}
                          className="w-24 px-2 py-1 border border-surface-300 rounded text-sm"
                          placeholder="Costo"
                        />
                        <button
                          onClick={() => handleEditRemoveItem(index)}
                          className="text-state-error hover:text-state-error/80 text-sm"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-4 gap-2 mb-4">
                  <div className="col-span-2">
                    <select
                      value={productLocalId}
                      onChange={(e) => setProductLocalId(e.target.value)}
                      className="w-full px-2 py-1.5 border border-surface-300 rounded text-sm"
                    >
                      <option value="">Producto</option>
                      {products.map((p) => (
                        <option key={p.localId} value={p.localId}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="number"
                    min="0.0001"
                    step="0.0001"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    className="px-2 py-1.5 border border-surface-300 rounded text-sm"
                    placeholder="Cant"
                  />
                  <button
                    onClick={handleEditAddItem}
                    disabled={!productLocalId}
                    className="px-3 py-1.5 bg-surface-200 text-content-primary rounded text-sm hover:bg-surface-300 disabled:opacity-50"
                  >
                    +
                  </button>
                </div>

                <div className="text-right text-sm font-medium text-content-primary mb-4">
                  Total: ${editItems.reduce((acc, i) => acc + i.qty * i.unitCost, 0).toFixed(2)}
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={handleCancelEdit}
                    className="px-4 py-2 text-sm font-medium text-content-secondary bg-surface-100 rounded-lg hover:bg-surface-200"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={purchasesState.isSubmitting || editItems.length === 0}
                    className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 disabled:opacity-50"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal de recepción */}
          {receivingPurchaseId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/50" onClick={handleCancelReceiving} />
              <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
                <h3 className="text-lg font-semibold text-content-primary mb-4">Recepcionar Compra</h3>
                
                <div className="space-y-3 mb-4">
                  {receiveForm.map((item, index) => {
                    const product = products.find(p => p.localId === item.productLocalId);
                    const originalItem = purchasesState.purchases
                      .find(p => p.localId === receivingPurchaseId)?.items.find(i => i.productLocalId === item.productLocalId);
                    
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
                            const formItem = newForm[index];
                            if (formItem) formItem.qty = Number(e.target.value);
                            setReceiveForm(newForm);
                          }}
                          className="w-20 px-2 py-1 border border-surface-300 rounded text-sm"
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={handleCancelReceiving}
                    className="px-4 py-2 text-sm font-medium text-content-secondary bg-surface-100 rounded-lg hover:bg-surface-200"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmReceive}
                    disabled={purchasesState.isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 disabled:opacity-50"
                  >
                    Confirmar Recepción
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}