import { useMemo } from "react";
import { LoadingSpinner } from "@/common/components/EmptyState";
import { Button, Select, Input, Card } from "@/common";
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
    <Card>
      <div className="card-header">
        <h3 className="card-title">Nueva Orden de Compra</h3>
      </div>
      <div className="card-body">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="label">Bodega *</label>
            <Select data-warehouse-select value={warehouseLocalId} onChange={(val) => setWarehouseLocalId(val as string)} options={warehouses?.map((wh) => ({ label: wh.name, value: wh.localId }))} placeholder="Seleccionar bodega" />
          </div>
          <div>
            <label className="label">Proveedor</label>
            <Select value={supplierLocalId} onChange={(val) => { setSupplierLocalId(val as string); setSupplierName(""); }} options={suppliers.filter(s => s.isActive).map((sup) => ({ label: sup.name, value: sup.localId }))} placeholder="Seleccionar proveedor" />
          </div>
          <div>
            <label className="label">O nombre manual</label>
            <Input value={supplierName} onChange={(e) => { setSupplierName(e.target.value); if (e.target.value) setSupplierLocalId(""); }} placeholder="Nombre del proveedor" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
          <div className="md:col-span-2">
            <label className="label">Producto</label>
            <Select value={productLocalId} onChange={(val) => setProductLocalId(val as string)} options={products.map((product) => ({ label: product.name, value: product.localId }))} placeholder="Seleccionar producto" />
          </div>
          <div>
            <label className="label">Cantidad</label>
            <Input type="number" min="0.0001" step="0.0001" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Cant" />
          </div>
          <div>
            <label className="label">Costo Unit.</label>
            <Input type="number" min="0" step="0.0001" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} placeholder="Costo" />
          </div>
          <div className="flex items-end">
            <Button type="button" onClick={onAddItem} disabled={!productLocalId} variant="secondary" className="w-full">
              <Plus className="w-4 h-4" />
              Agregar
            </Button>
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
                      <Button variant="ghost" size="sm" onClick={() => onRemoveItem(index)} className="text-state-error hover:bg-state-error/10 p-1">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 text-right font-medium text-content-primary">Total: ${total.toFixed(2)}</div>
          </div>
        )}

        <Button type="button" disabled={!canSubmit || isSubmitting} onClick={onSubmit} variant="primary" className="w-full">
          {isSubmitting ? <LoadingSpinner size="sm" /> : <><Check className="w-4 h-4" /> Crear Orden de Compra</>}
        </Button>
      </div>
    </Card>
  );
}