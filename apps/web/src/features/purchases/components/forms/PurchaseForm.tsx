import { useMemo } from "react";
import { Modal } from "@/common/components/Modal";
import { LoadingSpinner } from "@/common/components/EmptyState";
import { Plus, Check, X } from "lucide-react";
import type { Product } from "@/features/products/types/products.types";
import type { Warehouse } from "@/features/inventory/types/inventory.types";
import type { PurchaseItem, Supplier } from "../../types/purchases.types";

interface PurchaseFormProps {
  products: Product[];
  warehouses: Warehouse[];
  suppliers: Supplier[];
  warehouseLocalId: string;
  setWarehouseLocalId: (v: string) => void;
  supplierLocalId: string;
  setSupplierLocalId: (v: string) => void;
  supplierName: string;
  setSupplierName: (v: string) => void;
  productLocalId: string;
  setProductLocalId: (v: string) => void;
  qty: string;
  setQty: (v: string) => void;
  unitCost: string;
  setUnitCost: (v: string) => void;
  items: PurchaseItem[];
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

function formatQty(qty: number, isWeighted?: boolean | null): string {
  return (isWeighted ?? false) ? qty.toFixed(4) : qty.toFixed(2);
}

export function PurchaseForm({
  products,
  warehouses,
  suppliers,
  warehouseLocalId, setWarehouseLocalId,
  supplierLocalId, setSupplierLocalId,
  supplierName, setSupplierName,
  productLocalId, setProductLocalId,
  qty, setQty,
  unitCost, setUnitCost,
  items,
  onAddItem,
  onRemoveItem,
  onSubmit,
  isSubmitting
}: PurchaseFormProps) {
  const total = useMemo(() => items.reduce((acc, item) => acc + item.qty * item.unitCost, 0), [items]);
  const canSubmit = warehouseLocalId && items.length > 0;

  return (
    <div className="card">
      <div className="card-body">
        <h3 className="card-title mb-4">Nueva Orden de Compra</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="label">Bodega *</label>
            <select data-warehouse-select value={warehouseLocalId} onChange={(e) => setWarehouseLocalId(e.target.value)} className="input">
              <option value="">Seleccionar bodega</option>
              {warehouses?.map((wh) => (<option key={wh.localId} value={wh.localId}>{wh.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-content-secondary mb-1">Proveedor</label>
            <select value={supplierLocalId} onChange={(e) => { setSupplierLocalId(e.target.value); setSupplierName(""); }} className="input">
              <option value="">Seleccionar proveedor</option>
              {suppliers.filter(s => s.isActive).map((sup) => (<option key={sup.localId} value={sup.localId}>{sup.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-content-secondary mb-1">O nombre manual</label>
            <input value={supplierName} onChange={(e) => { setSupplierName(e.target.value); if (e.target.value) setSupplierLocalId(""); }} placeholder="Nombre del proveedor" className="input" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-content-secondary mb-1">Producto</label>
            <select value={productLocalId} onChange={(e) => setProductLocalId(e.target.value)} className="input">
              <option value="">Seleccionar producto</option>
              {products.map((product) => (<option key={product.localId} value={product.localId}>{product.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-content-secondary mb-1">Cantidad</label>
            <input type="number" min="0.0001" step="0.0001" value={qty} onChange={(e) => setQty(e.target.value)} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-content-secondary mb-1">Costo Unit.</label>
            <input type="number" min="0" step="0.0001" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} className="input" />
          </div>
          <div className="flex items-end">
            <button type="button" onClick={onAddItem} disabled={!productLocalId} className="btn btn-secondary w-full">
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
                      <button onClick={() => onRemoveItem(index)} className="text-state-error hover:text-state-error text-xs"><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 text-right font-medium text-content-primary">Total: ${total.toFixed(2)}</div>
          </div>
        )}

        <button type="button" disabled={!canSubmit || isSubmitting} onClick={onSubmit} className="btn btn-primary w-full">
          {isSubmitting ? <LoadingSpinner size="sm" /> : <><Check className="w-4 h-4" /> Crear Orden de Compra</>}
        </button>
      </div>
    </div>
  );
}