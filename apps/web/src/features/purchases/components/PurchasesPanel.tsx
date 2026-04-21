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

import { useEffect, useState, useCallback, useMemo } from "react";
import type { Product, Category, ProductPresentation } from "@/features/products/types/products.types";
import type { Warehouse } from "@/features/inventory/types/inventory.types";
import { eventBus } from "@/lib/core/runtime";
import { usePurchases } from "../hooks/usePurchases";
import { purchasesService } from "../services/purchases.service.instance";
import { PurchasesCatalogPanel } from "./PurchasesCatalogPanel";
import { Tabs, type TabItem } from "@/common/components/Tabs";
import { useKeyboardShortcuts, Button } from "@/common";
import type { PurchaseItem, PurchasesActorContext, PurchasesTenantContext, ReceivePurchaseInput } from "../types/purchases.types";

import { PurchaseForm } from "./forms/PurchaseForm";
import { EditPurchaseModal } from "./forms/EditPurchaseModal";
import { ReceivePurchaseModal } from "./forms/ReceivePurchaseModal";
import { PurchasesKPIs } from "./PurchasesKPIs";
import { PurchaseOrdersList } from "./PurchaseOrdersList";
import { ReceivingsList } from "./ReceivingsList";

interface PurchasesPanelProps {
  tenantSlug: string;
  actor: PurchasesActorContext;
  products: Product[];
  categories?: Category[];
  presentations?: ProductPresentation[];
  warehouses?: Warehouse[];
  onSetPreferredSupplier?: (productLocalId: string, supplierLocalId: string | null) => void;
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
  
  const [activeMainTab, setActiveMainTab] = useState<"orders" | "catalog">("orders");
  const [ordersSubTab, setOrdersSubTab] = useState<"orders-list" | "receivings">("orders-list");
  
  const [warehouseLocalId, setWarehouseLocalId] = useState("");
  const [supplierLocalId, setSupplierLocalId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [productLocalId, setProductLocalId] = useState("");
  const [qty, setQty] = useState("1");
  const [unitCost, setUnitCost] = useState("0");
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);
  const [editItems, setEditItems] = useState<PurchaseItem[]>([]);
  const [receivingPurchaseId, setReceivingPurchaseId] = useState<string | null>(null);
  const [receiveForm, setReceiveForm] = useState<{ productLocalId: string; qty: number; isWeighted?: boolean }[]>([]);

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

  useEffect(() => { void refreshPurchases(); }, [refreshPurchases]);

  useEffect(() => {
    const offCreated = eventBus.on("PURCHASES.CREATED", () => void refreshPurchases());
    const offReceived = eventBus.on("PURCHASES.RECEIVED", () => void refreshPurchases());
    const offConfirmed = eventBus.on("PURCHASES.CONFIRMED", () => void refreshPurchases());
    const offCancelled = eventBus.on("PURCHASES.CANCELLED", () => void refreshPurchases());
    const offUpdated = eventBus.on("PURCHASES.UPDATED", () => void refreshPurchases());
    return () => { offCreated(); offReceived(); offConfirmed(); offCancelled(); offUpdated(); };
  }, [refreshPurchases]);

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

  const handleStartReceiving = (purchase: { localId: string; status: string; items: PurchaseItem[] }) => {
    if (!["draft", "confirmed", "partial_received"].includes(purchase.status)) return;
    setReceivingPurchaseId(purchase.localId);
    setReceiveForm(purchase.items.map(item => {
      const product = products.find(p => p.localId === item.productLocalId);
      const isWeighted = product?.isWeighted ?? false;
      return {
        productLocalId: item.productLocalId,
        qty: item.qty,
        isWeighted
      };
    }));
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

  const kpiData = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const totalCompradoMes = purchasesState.purchases
      .filter(p => {
        if (p.status !== "received" || !p.receivedAt) return false;
        const receivedDate = new Date(p.receivedAt);
        return receivedDate >= startOfMonth && receivedDate <= now;
      })
      .reduce((sum, p) => sum + p.total, 0);

    const ordenesPendientes = purchasesState.purchases
      .filter(p => ["draft", "confirmed", "partial_received"].includes(p.status))
      .length;

    const proveedoresActivos = purchasesState.suppliers
      .filter(s => s.isActive)
      .length;

    return { totalCompradoMes, ordenesPendientes, proveedoresActivos };
  }, [purchasesState.purchases, purchasesState.suppliers]);

  const ordersSubTabs: TabItem[] = [
    { 
      id: "orders-list", 
      label: "Órdenes de Compra", 
      content: (
        <div className="space-y-6">
          <PurchaseForm
            products={products}
            warehouses={warehouses ?? []}
            suppliers={purchasesState.suppliers}
            warehouseLocalId={warehouseLocalId}
            setWarehouseLocalId={setWarehouseLocalId}
            supplierLocalId={supplierLocalId}
            setSupplierLocalId={setSupplierLocalId}
            supplierName={supplierName}
            setSupplierName={setSupplierName}
            productLocalId={productLocalId}
            setProductLocalId={setProductLocalId}
            qty={qty}
            setQty={setQty}
            unitCost={unitCost}
            setUnitCost={setUnitCost}
            items={items}
            onAddItem={handleAddItem}
            onRemoveItem={handleRemoveItem}
            onSubmit={handleCreatePurchase}
            isSubmitting={purchasesState.isSubmitting}
          />
          <PurchaseOrdersList
            purchases={purchasesState.purchases}
            suppliers={purchasesState.suppliers}
            warehouses={warehouses ?? []}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onConfirm={handleConfirmPurchase}
            onEdit={handleStartEdit}
            onCancel={handleCancelPurchase}
            onStartReceiving={handleStartReceiving}
          />
        </div>
      )
    },
    { 
      id: "receivings", 
      label: "Recepciones", 
      content: <ReceivingsList receivings={purchasesState.receivings} /> 
    }
  ];

  return (
    <section className="p-4 sm:p-6">
      <PurchasesKPIs 
        totalCompradoMes={kpiData.totalCompradoMes}
        ordenesPendientes={kpiData.ordenesPendientes}
        proveedoresActivos={kpiData.proveedoresActivos}
      />

      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-1 bg-surface-100 p-1 rounded-lg">
          <Button
            variant={activeMainTab === "orders" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setActiveMainTab("orders")}
          >
            Gestión de Órdenes
          </Button>
          <Button
            variant={activeMainTab === "catalog" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setActiveMainTab("catalog")}
          >
            Gestión del Catálogo
          </Button>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-content-tertiary">
          <span className="kbd">Ctrl</span>+<span className="kbd">N</span>
          <span className="hidden sm:inline">Nueva orden</span>
        </div>
      </div>

      {activeMainTab === "orders" ? (
        <Tabs 
          items={ordersSubTabs} 
          defaultTab={ordersSubTab} 
          onChange={(id) => setOrdersSubTab(id as typeof ordersSubTab)} 
          variant="underline" 
        />
      ) : (
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
      )}

      <EditPurchaseModal
        isOpen={!!editingPurchaseId}
        onClose={handleCancelEdit}
        editItems={editItems}
        products={products}
        productLocalId={productLocalId}
        setProductLocalId={setProductLocalId}
        qty={qty}
        setQty={setQty}
        onAddItem={handleEditAddItem}
        onRemoveItem={handleEditRemoveItem}
        onUpdateQty={handleEditUpdateQty}
        onUpdateUnitCost={handleEditUpdateUnitCost}
        onSubmit={handleSaveEdit}
        isSubmitting={purchasesState.isSubmitting}
      />

      <ReceivePurchaseModal
        isOpen={!!receivingPurchaseId}
        onClose={handleCancelReceiving}
        purchase={receivingPurchaseId ? purchasesState.purchases.find(p => p.localId === receivingPurchaseId) ?? null : null}
        receiveForm={receiveForm}
        setReceiveForm={setReceiveForm}
        products={products}
        onSubmit={handleConfirmReceive}
        isSubmitting={purchasesState.isSubmitting}
      />
    </section>
  );
}