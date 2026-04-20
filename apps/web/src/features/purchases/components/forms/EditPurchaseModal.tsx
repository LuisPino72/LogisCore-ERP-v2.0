import { Modal } from "@/common/components/Modal";
import { Button, Input, Select } from "@/common";
import { LoadingSpinner } from "@/common/components/EmptyState";
import { Plus, X } from "lucide-react";
import type { PurchaseItem } from "../../types/purchases.types";
import type { Product } from "@/features/products/types/products.types";

interface EditPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  editItems: PurchaseItem[];
  products: Product[];
  productLocalId: string;
  setProductLocalId: (v: string) => void;
  qty: string;
  setQty: (v: string) => void;
  onAddItem: () => void;
  onRemoveItem: (index: number) => void;
  onUpdateQty: (index: number, qty: number) => void;
  onUpdateUnitCost: (index: number, unitCost: number) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function EditPurchaseModal({
  isOpen,
  onClose,
  editItems,
  products,
  productLocalId, setProductLocalId,
  qty, setQty,
  onAddItem,
  onRemoveItem,
  onUpdateQty,
  onUpdateUnitCost,
  onSubmit,
  isSubmitting
}: EditPurchaseModalProps) {
  const total = editItems.reduce((acc, i) => acc + i.qty * i.unitCost, 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Editar Orden de Compra"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={onSubmit} disabled={isSubmitting || editItems.length === 0}>
            {isSubmitting ? <LoadingSpinner size="sm" /> : <><Plus className="w-4 h-4" /> Guardar</>}
          </Button>
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
              <Input
                type="number"
                min="0.0001"
                step="0.0001"
                value={item.qty}
                onChange={(e) => onUpdateQty(index, Number(e.target.value))}
                className="w-20"
              />
              <Input
                type="number"
                min="0"
                step="0.0001"
                value={item.unitCost}
                onChange={(e) => onUpdateUnitCost(index, Number(e.target.value))}
                className="w-24"
              />
              <Button onClick={() => onRemoveItem(index)} variant="ghost" size="sm"><X className="w-4 h-4" /></Button>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="col-span-2">
          <Select value={productLocalId} onChange={(value) => setProductLocalId(String(value))}>
            <option value="">Agregar producto</option>
            {products.map((p) => (<option key={p.localId} value={p.localId}>{p.name}</option>))}
          </Select>
        </div>
        <Input type="number" min="0.0001" step="0.0001" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Cant" />
        <Button onClick={onAddItem} disabled={!productLocalId} variant="secondary">
            <Plus className="w-4 h-4" />
          </Button>
      </div>

      <div className="text-right text-sm font-medium text-content-primary">
        Total: ${total.toFixed(2)}
      </div>
    </Modal>
  );
}