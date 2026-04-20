import { useState } from "react";
import type { Invoice } from "../types/invoicing.types";
import { Modal } from "@/common/components/Modal";
import { FormField, Textarea } from "@/common";
import { Alert } from "@/common/components/Alert";
import { Card } from "@/common/components/Card";
import { Button } from "@/common/components/Button";

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
          <Button onClick={onClose} variant="secondary">
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!reason.trim() || isSubmitting}
            variant="primary"
            className="bg-state-error hover:bg-red-600"
          >
            {isSubmitting ? "Anulando..." : "Anular Factura"}
          </Button>
        </>
      }
    >
      <div className="stack-md">
        <Alert variant="warning">
          <div>
            <p className="font-medium">Esta acción es irreversible</p>
            <p className="text-sm">
              La factura será marcada como anulada y no podrá ser usada para fines fiscales.
            </p>
          </div>
        </Alert>

        <Card variant="filled">
          <div className="stack-sm">
            <div className="flex justify-between">
              <span className="text-content-secondary">Factura:</span>
              <span className="font-mono">
                {invoice.invoiceNumber || invoice.localId.slice(0, 8)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-content-secondary">Cliente:</span>
              <span className="font-medium">{invoice.customerName || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-content-secondary">Total:</span>
              <span className="font-mono font-medium">{formatCurrency(invoice.total)}</span>
            </div>
          </div>
        </Card>

        <FormField label="Motivo de anulación" htmlFor="voidReason">
          <Textarea
            id="voidReason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ingrese el motivo de la anulación..."
            className="min-h-[100px]"
          />
          <p className="text-xs text-content-tertiary mt-1">
            El motivo será registrado en el log de auditoría.
          </p>
        </FormField>

        <div className="text-xs text-content-tertiary">
          Solo usuarios con rol de administrador pueden anular facturas.
        </div>
      </div>
    </Modal>
  );
}
