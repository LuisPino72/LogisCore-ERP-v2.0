import type { Invoice, TaxRule } from "../types/invoicing.types";

interface InvoicingKpiHeaderProps {
  invoices: Invoice[];
  taxRules: TaxRule[];
}

export function InvoicingKpiHeader({ invoices, taxRules }: InvoicingKpiHeaderProps) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const issuedInvoices = invoices.filter((inv) => {
    if (inv.status !== "issued" || !inv.issuedAt) return false;
    const issuedDate = new Date(inv.issuedAt);
    return (
      issuedDate.getMonth() === currentMonth &&
      issuedDate.getFullYear() === currentYear
    );
  });

  const totalInvoicedMonth = issuedInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const debitFiscalIva = issuedInvoices.reduce((sum, inv) => sum + inv.taxTotal, 0);
  const collectedIgtf = issuedInvoices.reduce((sum, inv) => sum + inv.igtfAmount, 0);

  const ivaRule = taxRules.find((r) => r.type === "iva" && r.isActive);
  const igtfRule = taxRules.find((r) => r.type === "igtf" && r.isActive);

  const lastIssuedInvoice = invoices
    .filter((inv) => inv.status === "issued" && inv.controlNumber)
    .sort((a, b) => {
      const aNum = parseInt(a.controlNumber || "0", 10);
      const bNum = parseInt(b.controlNumber || "0", 10);
      return bNum - aNum;
    })[0];

  const nextControlNumber = lastIssuedInvoice
    ? String(parseInt(lastIssuedInvoice.controlNumber || "0", 10) + 1).padStart(8, "0")
    : "00000001";

  const invoicesIssuedCount = issuedInvoices.length;
  const invoicesDraftCount = invoices.filter((inv) => inv.status === "draft").length;
  const invoicesVoidedCount = invoices.filter((inv) => inv.status === "voided").length;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-VE", {
      style: "currency",
      currency: "VES",
      minimumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="stat-card">
        <div className="stat-value text-state-success">
          {formatCurrency(totalInvoicedMonth)}
        </div>
        <div className="stat-label">Total Facturado (Mes)</div>
        <div className="text-xs text-content-tertiary mt-1">
          {invoicesIssuedCount} facturas emitidas
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-value text-state-info">
          {formatCurrency(debitFiscalIva)}
        </div>
        <div className="stat-label">Débito Fiscal (IVA)</div>
        <div className="text-xs text-content-tertiary mt-1">
          Tasa: {ivaRule?.rate || 16}%
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-value text-state-warning">
          {formatCurrency(collectedIgtf)}
        </div>
        <div className="stat-label">Recaudación IGTF</div>
        <div className="text-xs text-content-tertiary mt-1">
          Tasa: {igtfRule?.rate || 3}%
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-value text-content-secondary font-mono">
          {nextControlNumber}
        </div>
        <div className="stat-label">Próximo Control</div>
        <div className="text-xs text-content-tertiary mt-1">
          {invoicesDraftCount} borradores | {invoicesVoidedCount} anuladas
        </div>
      </div>
    </div>
  );
}
