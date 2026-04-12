import type { Invoice } from "../types/invoicing.types";
import type { TaxRule } from "../types/invoicing.types";

export interface InvoicePdfConfig {
  companyName: string;
  companyRif: string;
  companyAddress: string;
  companyPhone?: string;
  companyEmail?: string;
  footerText?: string;
}

export interface InvoicePdfData {
  invoice: Invoice;
  taxRules: TaxRule[];
  config: InvoicePdfConfig;
}

export interface GeneratedPdf {
  blob: Blob;
  fileName: string;
}

export const generateInvoicePdf = async (data: InvoicePdfData): Promise<GeneratedPdf> => {
  const { invoice, taxRules, config } = data;

  const groupedByAliquota = groupItemsByAliquota(invoice.items);
  
  const html = buildPdfHtml(invoice, groupedByAliquota, taxRules, config);

  const blob = new Blob([html], { type: "text/html" });
  
  const fileName = `Factura_${invoice.invoiceNumber || invoice.localId}_${formatDate(invoice.issuedAt)}.html`;

  return { blob, fileName };
};

const groupItemsByAliquota = (items: Invoice["items"]) => {
  const groups: Record<string, Invoice["items"]> = {};
  
  for (const item of items) {
    const key = String(item.taxRate);
    if (!groups[key]) {
      groups[key] = [];
    }
    if (groups[key]) groups[key].push(item);
  }
  
  return groups;
};

const buildPdfHtml = (
  invoice: Invoice,
  groupedByAliquota: ReturnType<typeof groupItemsByAliquota>,
  taxRules: TaxRule[],
  config: InvoicePdfConfig
): string => {
  const formatCurrency = (value: number, currency: string = "VES") =>
    new Intl.NumberFormat("es-VE", {
      style: "currency",
      currency,
      minimumFractionDigits: 2
    }).format(value);

  const itemsHtml = invoice.items
    .map(
      (item) => `
    <tr>
      <td>${item.description}</td>
      <td class="text-right">${item.qty}</td>
      <td class="text-right">${formatCurrency(item.unitPrice)}</td>
      <td class="text-right">${item.taxRate}%</td>
      <td class="text-right">${formatCurrency(item.subtotal)}</td>
    </tr>
  `
    )
    .join("");

  const taxBreakdownHtml = Object.entries(groupedByAliquota)
    .map(([rate, items]) => {
      const totalBase = items.reduce((sum, item) => sum + item.subtotal, 0);
      const totalTax = items.reduce((sum, item) => sum + item.taxAmount, 0);
      return `
      <tr class="border-t">
        <td colspan="4" class="text-right font-medium">Base ${rate}%:</td>
        <td class="text-right">${formatCurrency(totalBase)}</td>
      </tr>
      <tr>
        <td colspan="4" class="text-right">IVA ${rate}%:</td>
        <td class="text-right">${formatCurrency(totalTax)}</td>
      </tr>
    `;
    })
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Factura ${invoice.invoiceNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; color: #333; }
    .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
    .company-info { max-width: 60%; }
    .company-name { font-size: 18px; font-weight: bold; }
    .invoice-info { text-align: right; }
    .invoice-title { font-size: 24px; font-weight: bold; color: #1a1a1a; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #f5f5f5; padding: 8px; text-align: left; border-bottom: 2px solid #333; }
    td { padding: 8px; border-bottom: 1px solid #e5e5e5; }
    .text-right { text-align: right; }
    .totals { margin-top: 20px; }
    .totals-table td { padding: 4px 8px; }
    .totals-table .total-row { font-size: 16px; font-weight: bold; background: #f5f5f5; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 10px; color: #666; }
    .footer-text { text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-info">
      <div class="company-name">${config.companyName}</div>
      <div>RIF: ${config.companyRif}</div>
      <div>${config.companyAddress}</div>
      ${config.companyPhone ? `<div>Telf: ${config.companyPhone}</div>` : ""}
      ${config.companyEmail ? `<div>Email: ${config.companyEmail}</div>` : ""}
    </div>
    <div class="invoice-info">
      <div class="invoice-title">FACTURA</div>
      <div>Nro: ${invoice.invoiceNumber || "N/A"}</div>
      <div>Control: ${invoice.controlNumber || "N/A"}</div>
      <div>Fecha: ${formatDate(invoice.issuedAt)}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Descripción</th>
        <th class="text-right">Cant</th>
        <th class="text-right">Precio</th>
        <th class="text-right">IVA</th>
        <th class="text-right">Importe</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <table class="totals">
    <tr>
      <td colspan="4" class="text-right">Subtotal:</td>
      <td class="text-right">${formatCurrency(invoice.subtotal)}</td>
    </tr>
    ${taxBreakdownHtml}
    ${invoice.igtfAmount > 0 ? `
    <tr>
      <td colspan="4" class="text-right">IGTF (3%):</td>
      <td class="text-right">${formatCurrency(invoice.igtfAmount)}</td>
    </tr>
    ` : ""}
    <tr class="total-row">
      <td colspan="4" class="text-right">TOTAL:</td>
      <td class="text-right">${formatCurrency(invoice.total)}</td>
    </tr>
  </table>

  ${invoice.exchangeRateSnapshot ? `
  <div style="margin-top: 20px; font-size: 10px; color: #666;">
    <div>Tasa de cambio: ${invoice.exchangeRateSnapshot.rate} Bs/USD (Fuente: ${invoice.exchangeRateSnapshot.source})</div>
    <div>Capturada: ${formatDate(invoice.exchangeRateSnapshot.capturedAt)}</div>
  </div>
  ` : ""}

  <div class="footer">
    <div class="footer-text">
      ${config.footerText || "Documento fiscal generado según normativa SENIAT - Forma Libre"}
    </div>
  </div>
</body>
</html>
  `.trim();
};

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  return date.toLocaleDateString("es-VE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
};