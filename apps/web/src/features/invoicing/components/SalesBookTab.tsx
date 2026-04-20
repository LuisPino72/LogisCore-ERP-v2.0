import { useMemo, useState } from "react";
import type { Invoice, TaxRule } from "../types/invoicing.types";
import { Badge } from "@/common/components/Badge";
import { EmptyState } from "@/common/components/EmptyState";
import { Select } from "@/common";
import { BookOpen } from "lucide-react";

interface SalesBookTabProps {
  invoices: Invoice[];
  taxRules: TaxRule[];
}

const months = [
  { value: 0, label: "Enero" },
  { value: 1, label: "Febrero" },
  { value: 2, label: "Marzo" },
  { value: 3, label: "Abril" },
  { value: 4, label: "Mayo" },
  { value: 5, label: "Junio" },
  { value: 6, label: "Julio" },
  { value: 7, label: "Agosto" },
  { value: 8, label: "Septiembre" },
  { value: 9, label: "Octubre" },
  { value: 10, label: "Noviembre" },
  { value: 11, label: "Diciembre" },
];

export function SalesBookTab({ invoices, taxRules }: SalesBookTabProps) {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const ivaRule = taxRules.find((r) => r.type === "iva" && r.isActive);
  const igtfRule = taxRules.find((r) => r.type === "igtf" && r.isActive);

  const monthInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (inv.status !== "issued" || !inv.issuedAt) return false;
      const date = new Date(inv.issuedAt);
      return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
    });
  }, [invoices, selectedMonth, selectedYear]);

  const totals = useMemo(() => {
    const subtotal = monthInvoices.reduce((sum, inv) => sum + inv.subtotal, 0);
    const taxTotal = monthInvoices.reduce((sum, inv) => sum + inv.taxTotal, 0);
    const igtfAmount = monthInvoices.reduce((sum, inv) => sum + inv.igtfAmount, 0);
    const total = monthInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const count = monthInvoices.length;

    const roundedSubtotal = Math.round((subtotal + Number.EPSILON) * 100) / 100;
    const roundedTaxTotal = Math.round((taxTotal + Number.EPSILON) * 100) / 100;
    const roundedIgtf = Math.round((igtfAmount + Number.EPSILON) * 100) / 100;
    const roundedTotal = Math.round((total + Number.EPSILON) * 100) / 100;
    const computedTotal = Math.round((roundedSubtotal + roundedTaxTotal + roundedIgtf + Number.EPSILON) * 100) / 100;

    const centsDiff = Math.abs(roundedTotal - computedTotal);

    return {
      subtotal: roundedSubtotal,
      taxTotal: roundedTaxTotal,
      igtfAmount: roundedIgtf,
      total: roundedTotal,
      count,
      centsDiff,
      isValid: centsDiff <= 0.01,
    };
  }, [monthInvoices]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-VE", {
      style: "currency",
      currency: "VES",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("es-VE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-content-primary flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Libro de Ventas
        </h3>
        <div className="flex items-center gap-2">
          <Select
            value={String(selectedMonth)}
            onChange={(value) => setSelectedMonth(parseInt(String(value)))}
            className="py-1.5 px-3 text-sm w-auto"
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
          <Select
            value={String(selectedYear)}
            onChange={(value) => setSelectedYear(parseInt(String(value)))}
            className="py-1.5 px-3 text-sm w-auto"
          >
            {[selectedYear, selectedYear - 1, selectedYear - 2].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {monthInvoices.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-12 h-12 text-content-tertiary" />}
          title="No hay facturas emitidas"
          description={`No se emitieron facturas en ${months[selectedMonth]?.label ?? ''} de ${selectedYear}.`}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="stat-card">
              <div className="stat-value">{totals.count}</div>
              <div className="stat-label">Facturas Emitidas</div>
            </div>
            <div className="stat-card">
              <div className="stat-value text-state-success">
                {formatCurrency(totals.subtotal)}
              </div>
              <div className="stat-label">Ventas Exentas</div>
            </div>
            <div className="stat-card">
              <div className="stat-value text-state-info">
                {formatCurrency(totals.taxTotal)}
              </div>
              <div className="stat-label">IVA ({ivaRule?.rate ?? 16}%)</div>
            </div>
            <div className="stat-card">
              <div className="stat-value text-state-warning">
                {formatCurrency(totals.igtfAmount)}
              </div>
              <div className="stat-label">IGTF ({igtfRule?.rate ?? 3}%)</div>
            </div>
          </div>

          <div className="card">
            <div className="card-header flex justify-between items-center">
              <span className="card-title">Resumen del Mes</span>
              <Badge variant={totals.isValid ? "success" : "error"}>
                {totals.isValid ? "CéntimosOK" : `Diff: ${totals.centsDiff.toFixed(2)}`}
              </Badge>
            </div>
            <div className="card-body space-y-3">
              <div className="flex justify-between">
                <span className="text-content-secondary">Total Ventas (Base):</span>
                <span className="font-mono">{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-content-secondary">Débito Fiscal IVA:</span>
                <span className="font-mono">{formatCurrency(totals.taxTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-content-secondary">IGTF Перевод +3%:</span>
                <span className="font-mono">{formatCurrency(totals.igtfAmount)}</span>
              </div>
              <div className="divider" />
              <div className="flex justify-between font-medium text-lg">
                <span>Total general:</span>
                <span className="font-mono">{formatCurrency(totals.total)}</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto border border-surface-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-surface-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-content-tertiary uppercase">Fecha</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-content-tertiary uppercase">N° Factura</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-content-tertiary uppercase">Cliente</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-content-tertiary uppercase">RIF</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-content-tertiary uppercase">Base</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-content-tertiary uppercase">IVA</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-content-tertiary uppercase">IGTF</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-content-tertiary uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200">
                {monthInvoices.map((inv) => (
                  <tr key={inv.localId} className="hover:bg-surface-50">
                    <td className="px-3 py-2 text-content-secondary">
                      {inv.issuedAt ? formatDate(inv.issuedAt) : "—"}
                    </td>
                    <td className="px-3 py-2 font-mono">
                      {inv.invoiceNumber || inv.localId.slice(0, 8)}
                    </td>
                    <td className="px-3 py-2">{inv.customerName || "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs">{inv.customerRif || "—"}</td>
                    <td className="px-3 py-2 text-right font-mono">{inv.subtotal.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right font-mono">{inv.taxTotal.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right font-mono">{inv.igtfAmount.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right font-mono font-medium">{inv.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
