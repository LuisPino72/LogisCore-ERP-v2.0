import { useState } from "react";
import type { Invoice } from "../types/invoicing.types";
import { Modal } from "@/common/components/Modal";
import { AlertTriangle } from "lucide-react";

interface VoidInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onVoid: (reason: string) => Promise<void>;
  isSubmitting: boolean;
}

export function VoidInvoiceModal({
  isOpen,
  onClose,
  invoice,
  onVoid,
  isSubmitting,
}: VoidInvoiceModalProps) {
  const [reason, setReason] = useState("");

  const handleSubmit = async () => {
    if (!reason.trim() || isSubmitting) return;
    await onVoid(reason.trim());
    setReason("");
    onClose();
  };

  if (!invoice) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-VE", {
      style: "currency",
      currency: invoice.currency,
    }).format(value);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Anular Factura"
      size="md"
      footer={
        <>
          <button onClick={onClose} className="btn btn-secondary">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!reason.trim() || isSubmitting}
            className="btn btn-primary bg-state-error hover:bg-red-600"
          >
            {isSubmitting ? "Anulando..." : "Anular Factura"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="alert alert-warning">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-medium">Esta acción es irreversible</p>
            <p className="text-sm">
              La factura será marcada como anulada y no podrá ser usada para fines fiscales.
            </p>
          </div>
        </div>

        <div className="bg-surface-50 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-content-secondary">Factura:</span>
            <span className="font-mono">
              {invoice.invoiceNumber || invoice.localId.slice(0, 8)}
            </span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-content-secondary">Cliente:</span>
            <span className="font-medium">{invoice.customerName || "—"}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-content-secondary">Total:</span>
            <span className="font-mono font-medium">{formatCurrency(invoice.total)}</span>
          </div>
        </div>

        <div>
          <label className="label">Motivo de anulación</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ingrese el motivo de la anulación..."
            className="input min-h-[100px]"
          />
          <p className="text-xs text-content-tertiary mt-1">
            El motivo será registrado en el log de auditoría.
          </p>
        </div>

        <div className="text-xs text-content-tertiary">
          Solo usuarios con rol de administrador pueden anular facturas.
        </div>
      </div>
    </Modal>
  );
}
