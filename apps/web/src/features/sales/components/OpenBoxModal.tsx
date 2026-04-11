import { useState } from "react";
import { Modal } from "@/common/components/Modal";
import { FormField, Select, Input } from "@/common";
import { DollarSign } from "lucide-react";

interface OpenBoxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (openingAmount: number) => void;
  warehouses: { localId: string; name: string }[];
  selectedWarehouse: string;
  onSelectWarehouse: (localId: string) => void;
}

export function OpenBoxModal({
  isOpen,
  onClose,
  onConfirm,
  warehouses,
  selectedWarehouse,
  onSelectWarehouse
}: OpenBoxModalProps) {
  const [openingAmount, setOpeningAmount] = useState("");

  const handleConfirm = () => {
    const amount = Number(openingAmount);
    if (amount >= 0) {
      onConfirm(amount);
      setOpeningAmount("");
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Apertura de Caja"
      footer={
        <>
          <button onClick={onClose} className="btn btn-secondary">
            Cancelar
          </button>
          <button onClick={handleConfirm} className="btn btn-primary">
            Abrir Caja
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Bodega" htmlFor="boxWarehouse" required>
          <Select
            value={selectedWarehouse}
            onChange={(value) => onSelectWarehouse(String(value))}
            options={warehouses.map(w => ({ value: w.localId, label: w.name }))}
          />
        </FormField>
        <FormField label="Monto Inicial" htmlFor="openingAmount" required>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-tertiary" />
            <Input
              id="openingAmount"
              type="number"
              step="0.01"
              min="0"
              value={openingAmount}
              onChange={(e) => setOpeningAmount(e.target.value)}
              placeholder="0.00"
              className="pl-10"
            />
          </div>
        </FormField>
      </div>
    </Modal>
  );
}