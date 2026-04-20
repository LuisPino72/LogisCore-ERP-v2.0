import { Modal } from "@/common/components/Modal";
import { Button } from "@/common/components/Button";
import { LoadingSpinner } from "@/common/components/EmptyState";
import { Input } from "@/common/components/FormField";
import { Check } from "lucide-react";
import type { Purchase } from "../../types/purchases.types";
import type { Product } from "@/features/products/types/products.types";

interface ReceivePurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: Purchase | null;
  receiveForm: { productLocalId: string; qty: number }[];
  setReceiveForm: (form: { productLocalId: string; qty: number }[]) => void;
  products: Product[];
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function ReceivePurchaseModal({
  isOpen,
  onClose,
  purchase,
  receiveForm,
  setReceiveForm,
  products,
  onSubmit,
  isSubmitting
}: ReceivePurchaseModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Recepcionar Compra"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? <LoadingSpinner size="sm" /> : <><Check className="w-4 h-4" /> Confirmar</>}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {receiveForm.map((item, index) => {
          const product = products.find(p => p.localId === item.productLocalId);
          const originalItem = purchase?.items.find(i => i.productLocalId === item.productLocalId);
          
          return (
            <div key={index} className="flex items-center gap-3">
              <span className="flex-1 text-sm text-content-primary">
                {product?.name || item.productLocalId}
              </span>
              <span className="text-xs text-content-tertiary">
                (ordenado: {originalItem?.qty || 0})
              </span>
              <Input
                type="number"
                min={0}
                max={originalItem?.qty || 0}
                value={String(item.qty)}
                onChange={(e) => {
                  const newForm = [...receiveForm];
                  newForm[index] = { ...newForm[index]!, qty: Number(e.target.value) };
                  setReceiveForm(newForm);
                }}
                className="w-20"
              />
            </div>
          );
        })}
      </div>
    </Modal>
  );
}