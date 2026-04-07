import { useState } from "react";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-surface-200">
          <h2 className="text-lg font-semibold text-content-primary">Apertura de Caja</h2>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="label">Bodega</label>
            <select
              value={selectedWarehouse}
              onChange={(e) => onSelectWarehouse(e.target.value)}
              className="input"
            >
              {warehouses.map(w => (
                <option key={w.localId} value={w.localId}>{w.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Monto Inicial</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-tertiary" />
              <input
                type="number"
                step="0.01"
                min="0"
                value={openingAmount}
                onChange={(e) => setOpeningAmount(e.target.value)}
                placeholder="0.00"
                className="input pl-10"
              />
            </div>
            <p className="text-xs text-content-tertiary mt-1">
              Ingrese el monto en efectivo con el que inicia la caja
            </p>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-surface-200 flex justify-end gap-3">
          <button onClick={onClose} className="btn btn-secondary">
            Cancelar
          </button>
          <button 
            onClick={handleConfirm} 
            className="btn btn-primary"
          >
            Abrir Caja
          </button>
        </div>
      </div>
    </div>
  );
}
