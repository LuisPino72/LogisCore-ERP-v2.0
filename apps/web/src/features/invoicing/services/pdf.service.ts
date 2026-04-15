import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import type { Invoice, InvoiceItem, TaxRule } from "../types/invoicing.types";
import { createAppError } from "@logiscore/core";
import { ok, err, type AppError } from "@logiscore/core";

export interface TenantPdfConfig {
  companyName: string;
  companyRif: string;
  companyAddress: string;
  companyPhone?: string;
  companyEmail?: string;
}

export interface GeneratePdfInput {
  invoice: Invoice;
  taxRules: TaxRule[];
  tenant: TenantPdfConfig;
}

export interface GeneratedPdfResult {
  blob: Blob;
  fileName: string;
}

const formatCurrency = (value: number, currency: string = "VES"): string => {
  return new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
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

const formatQuantity = (item: InvoiceItem): string => {
  if (item.isWeighted) {
    return item.qty.toFixed(4);
  }
  return item.qty.toFixed(0);
};

const groupItemsByAliquota = (items: InvoiceItem[]) => {
  const groups: Record<string, InvoiceItem[]> = {};
  
  for (const item of items) {
    const key = String(item.taxRate);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
  }
  
  return groups;
};

const generateQrCode = async (invoice: Invoice): Promise<string> => {
  const qrData = {
    localId: invoice.localId,
    invoiceNumber: invoice.invoiceNumber,
    controlNumber: invoice.controlNumber,
    total: invoice.total,
    currency: invoice.currency,
    issuedAt: invoice.issuedAt,
    exchangeRateSnapshot: invoice.exchangeRateSnapshot
  };

  return QRCode.toDataURL(JSON.stringify(qrData), {
    width: 128,
    margin: 1,
    errorCorrectionLevel: "M"
  });
};

export const generateCertifiedPdf = async (
  input: GeneratePdfInput
): Promise<{ ok: true; data: GeneratedPdfResult } | { ok: false; error: AppError }> => {
  try {
    const { invoice, tenant } = input;

    if (invoice.status !== "issued") {
      return err(
        createAppError({
          code: "INVOICE_PDF_NOT_ISSUED",
          message: "Solo se pueden generar PDFs de facturas emitidas",
          retryable: false,
          context: { status: invoice.status }
        })
      );
    }

    if (!invoice.invoiceNumber || !invoice.controlNumber) {
      return err(
        createAppError({
          code: "INVOICE_PDF_MISSING_DATA",
          message: "La factura no tiene número de factura o control asignado",
          retryable: false,
          context: {
            invoiceNumber: invoice.invoiceNumber,
            controlNumber: invoice.controlNumber
          }
        })
      );
    }

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "letter"
    });

    doc.setFont("helvetica");

    const pageWidth = doc.internal.pageSize.getWidth();
    const marginLeft = 15;
    const marginRight = 15;

    let currentY = 15;

    const qrCodeDataUrl = await generateQrCode(invoice);
    doc.addImage(qrCodeDataUrl, "PNG", pageWidth - 45, currentY, 30, 30);

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(tenant.companyName, marginLeft, currentY + 5);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`RIF: ${tenant.companyRif}`, marginLeft, currentY + 11);
    doc.text(tenant.companyAddress, marginLeft, currentY + 16);
    if (tenant.companyPhone) {
      doc.text(`Telf: ${tenant.companyPhone}`, marginLeft, currentY + 21);
    }
    if (tenant.companyEmail) {
      doc.text(`Email: ${tenant.companyEmail}`, marginLeft, currentY + 26);
    }

    currentY = 50;

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("FACTURA", pageWidth / 2, currentY, { align: "center" });

    currentY += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Nro: ${invoice.invoiceNumber}`, pageWidth - marginRight, currentY, { align: "right" });
    currentY += 5;
    doc.text(`Control: ${invoice.controlNumber}`, pageWidth - marginRight, currentY, { align: "right" });
    currentY += 5;
    doc.text(`Fecha: ${formatDate(invoice.issuedAt)}`, pageWidth - marginRight, currentY, { align: "right" });

    currentY += 10;

    if (invoice.customerName || invoice.customerRif) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("CLIENTE:", marginLeft, currentY);
      doc.setFont("helvetica", "normal");
      currentY += 5;
      
      if (invoice.customerName) {
        doc.text(invoice.customerName, marginLeft, currentY);
        currentY += 4;
      }
      if (invoice.customerRif) {
        doc.text(`RIF: ${invoice.customerRif}`, marginLeft, currentY);
        currentY += 4;
      }
      currentY += 5;
    }

    const tableData = invoice.items.map((item) => [
      item.description,
      formatQuantity(item),
      formatCurrency(item.unitPrice),
      `${item.taxRate}%`,
      formatCurrency(item.subtotal)
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [["Descripción", "Cant", "Precio", "IVA", "Importe"]],
      body: tableData,
      margin: { left: marginLeft, right: marginRight },
      headStyles: {
        fillColor: [240, 240, 240],
        textColor: [50, 50, 50],
        fontStyle: "bold",
        fontSize: 9
      },
      bodyStyles: {
        fontSize: 8
      },
      columnStyles: {
        0: { cellWidth: "auto" },
        1: { halign: "right", cellWidth: 20 },
        2: { halign: "right", cellWidth: 25 },
        3: { halign: "right", cellWidth: 15 },
        4: { halign: "right", cellWidth: 25 }
      },
      theme: "plain",
      styles: {
        lineColor: [200, 200, 200],
        lineWidth: 0.1
      }
    });

    currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

    const totalsData: [string, string][] = [
      ["Subtotal:", formatCurrency(invoice.subtotal)]
    ];

    const groupedByAliquota = groupItemsByAliquota(invoice.items);
    for (const [rate, items] of Object.entries(groupedByAliquota)) {
      const baseImponible = items.reduce((sum, item) => sum + item.subtotal, 0);
      const ivaMonto = items.reduce((sum, item) => sum + item.taxAmount, 0);
      totalsData.push([`Base ${rate}%:`, formatCurrency(baseImponible)]);
      totalsData.push([`IVA ${rate}%:`, formatCurrency(ivaMonto)]);
    }

    if (invoice.igtfAmount > 0) {
      totalsData.push(["IGTF (3%):", formatCurrency(invoice.igtfAmount)]);
    }

    totalsData.push(["TOTAL:", formatCurrency(invoice.total)]);

    autoTable(doc, {
      startY: currentY,
      body: totalsData,
      margin: { left: pageWidth - 80, right: marginRight },
      tableWidth: 65,
      theme: "plain",
      styles: {
        fontSize: 9,
        cellPadding: 2
      },
      columnStyles: {
        0: { halign: "right", fontStyle: "bold" },
        1: { halign: "right" }
      },
      didDrawPage: () => {}
    });

    currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

    if (invoice.exchangeRateSnapshot && currentY < 250) {
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Tasa de cambio: ${invoice.exchangeRateSnapshot.rate} Bs/USD (Fuente: ${invoice.exchangeRateSnapshot.source})`,
        marginLeft,
        currentY
      );
      currentY += 4;
      doc.text(
        `Capturada: ${formatDate(invoice.exchangeRateSnapshot.capturedAt)}`,
        marginLeft,
        currentY
      );
    }

    const footerY = 280;
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      "Documento fiscal generado según normativa SENIAT - Forma Libre",
      pageWidth / 2,
      footerY,
      { align: "center" }
    );

    const pdfBlob = doc.output("blob") as Blob;
    const fileName = `Factura_${invoice.invoiceNumber}_${formatDate(invoice.issuedAt)}.pdf`;

    return ok({ blob: pdfBlob, fileName });
  } catch (cause) {
    return err(
      createAppError({
        code: "PDF_GENERATION_FAILED",
        message: "Error al generar el PDF de la factura",
        retryable: true,
        cause
      })
    );
  }
};