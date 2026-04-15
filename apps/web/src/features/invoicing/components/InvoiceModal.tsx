import type { Invoice } from "../types/invoicing.types";
import { Modal } from "@/common/components/Modal";
import { Badge } from "@/common/components/Badge";
import { User, Calendar, CreditCard, FileDown } from "lucide-react";
import { generateCertifiedPdf } from "../services/pdf.service";
import { logPdfExport } from "../services/audit.service";
import { useState } from "react";

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  tenantConfig?: {
    companyName: string;
    companyRif: string;
    companyAddress: string;
    companyPhone?: string;
    companyEmail?: string;
  };
}

const statusConfig: Record<string, { variant: "default" | "success" | "error"; label: string }> = {
  draft: { variant: "default", label: "Borrador" },
  issued: { variant: "success", label: "Emitida" },
  voided: { variant: "error", label: "Anulada" },
};

export function InvoiceModal({ isOpen, onClose, invoice, tenantConfig }: InvoiceModalProps) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  if (!invoice) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-VE", {
      style: "currency",
      currency: invoice.currency,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("es-VE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const status = statusConfig[invoice.status] || { variant: "default", label: invoice.status };

  const handleGeneratePdf = async () => {
    if (!tenantConfig) {
      setPdfError("Configuración del tenant no disponible");
      return;
    }

    setIsGeneratingPdf(true);
    setPdfError(null);

    const result = await generateCertifiedPdf({
      invoice,
      taxRules: [],
      tenant: tenantConfig
    });

    if (result.ok) {
      const url = URL.createObjectURL(result.data.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.data.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      logPdfExport({
        invoiceId: invoice.localId,
        invoiceNumber: invoice.invoiceNumber ?? ""
      });
    } else {
      setPdfError(result.error.message);
    }

    setIsGeneratingPdf(false);
  };

  const canDownloadPdf = invoice.status === "issued" && tenantConfig;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Factura ${invoice.invoiceNumber || invoice.localId.slice(0, 8)}`}
      size="lg"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Badge variant={status.variant}>{status.label}</Badge>
          <div className="flex items-center gap-3">
            {pdfError && (
              <span className="text-sm text-state-error">{pdfError}</span>
            )}
            {canDownloadPdf && (
              <button
                onClick={handleGeneratePdf}
                disabled={isGeneratingPdf}
                className="btn btn-primary flex items-center gap-2 text-sm py-1.5 px-3"
              >
                <FileDown className="w-4 h-4" />
                {isGeneratingPdf ? "Generando..." : "Descargar PDF"}
              </button>
            )}
            {invoice.controlNumber && (
              <span className="font-mono text-sm text-content-secondary">
                Control: {invoice.controlNumber}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-content-tertiary" />
            <span className="text-content-tertiary">Cliente:</span>
            <span className="font-medium">{invoice.customerName || "—"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-content-tertiary">RIF:</span>
            <span className="font-mono">{invoice.customerRif || "—"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-content-tertiary" />
            <span className="text-content-tertiary">Creada:</span>
            <span>{formatDate(invoice.createdAt)}</span>
          </div>
          {invoice.issuedAt && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-content-tertiary" />
              <span className="text-content-tertiary">Emitida:</span>
              <span>{formatDate(invoice.issuedAt)}</span>
            </div>
          )}
        </div>

        <div className="border-t border-surface-200 pt-4">
          <h4 className="font-medium mb-3">Ítems</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-50">
                <tr>
                  <th className="px-2 py-1 text-left text-xs font-medium text-content-tertiary">Descripción</th>
                  <th className="px-2 py-1 text-right text-xs font-medium text-content-tertiary">Qty</th>
                  <th className="px-2 py-1 text-right text-xs font-medium text-content-tertiary">Precio</th>
                  <th className="px-2 py-1 text-right text-xs font-medium text-content-tertiary">IVA</th>
                  <th className="px-2 py-1 text-right text-xs font-medium text-content-tertiary">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {invoice.items.map((item, index) => (
                  <tr key={index}>
                    <td className="px-2 py-2">{item.description}</td>
                    <td className="px-2 py-2 text-right font-mono">{item.qty.toFixed(4)}</td>
                    <td className="px-2 py-2 text-right font-mono">{item.unitPrice.toFixed(2)}</td>
                    <td className="px-2 py-2 text-right font-mono">{item.taxRate}%</td>
                    <td className="px-2 py-2 text-right font-mono">{item.subtotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-surface-50 p-4 rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-content-secondary">Subtotal:</span>
            <span className="font-mono">{formatCurrency(invoice.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-content-secondary">IVA:</span>
            <span className="font-mono">{formatCurrency(invoice.taxTotal)}</span>
          </div>
          {invoice.igtfAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-content-secondary">IGTF:</span>
              <span className="font-mono">{formatCurrency(invoice.igtfAmount)}</span>
            </div>
          )}
          {invoice.discountTotal > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-content-secondary">Descuento:</span>
              <span className="font-mono text-state-error">-{formatCurrency(invoice.discountTotal)}</span>
            </div>
          )}
          <div className="divider" />
          <div className="flex justify-between font-medium text-lg">
            <span>Total:</span>
            <span className="font-mono">{formatCurrency(invoice.total)}</span>
          </div>
        </div>

        {invoice.payments.length > 0 && (
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Pagos
            </h4>
            <div className="space-y-1">
              {invoice.payments.map((payment, index) => (
                <div key={index} className="flex justify-between text-sm bg-surface-50 p-2 rounded">
                  <span className="capitalize">{payment.method}</span>
                  <span className="font-mono">
                    {payment.currency} {payment.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {invoice.notes && (
          <div className="text-sm text-content-secondary">
            <span className="font-medium">Notas:</span> {invoice.notes}
          </div>
        )}
      </div>
    </Modal>
  );
}
