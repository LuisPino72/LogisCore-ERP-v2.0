import { useMemo } from "react";
import type { FinanceReport } from "../types/reports.types";
import { TrendingUp, TrendingDown, Percent, DollarSign, Wallet, Receipt, ShoppingCart, Activity } from "lucide-react";

interface FinanceTabProps {
  financeReports: FinanceReport[];
  isLoading: boolean;
}

export function FinanceTab({ financeReports, isLoading }: FinanceTabProps) {
  const totals = useMemo(() => {
    if (financeReports.length === 0) {
      return {
        totalSales: 0,
        subtotal: 0,
        taxTotal: 0,
        discountTotal: 0,
        cogs: 0,
        purchasesConfirmed: 0,
        purchasesReceived: 0,
        grossProfit: 0,
        operatingProfit: 0,
        avgMargin: 0,
        ivaCollected: 0,
        igtfCollected: 0,
        exchangeRate: 36.0,
        totalTransactions: 0,
        totalItems: 0
      };
    }

    return financeReports.reduce(
      (acc, r) => ({
        totalSales: acc.totalSales + r.totalSales,
        subtotal: acc.subtotal + r.subtotal,
        taxTotal: acc.taxTotal + r.taxTotal,
        discountTotal: acc.discountTotal + r.discountTotal,
        cogs: acc.cogs + r.cogs,
        purchasesConfirmed: acc.purchasesConfirmed + r.purchasesConfirmed,
        purchasesReceived: acc.purchasesReceived + r.purchasesReceived,
        grossProfit: acc.grossProfit + r.grossProfit,
        operatingProfit: acc.operatingProfit + r.operatingProfit,
        avgMargin: (acc.avgMargin + r.profitMarginPercent) / financeReports.length,
        ivaCollected: acc.ivaCollected + r.ivaCollected,
        igtfCollected: acc.igtfCollected + r.igtfCollected,
        exchangeRate: r.exchangeRateUsed,
        totalTransactions: acc.totalTransactions + r.totalTransactions,
        totalItems: acc.totalItems + r.totalItems
      }),
      {
        totalSales: 0,
        subtotal: 0,
        taxTotal: 0,
        discountTotal: 0,
        cogs: 0,
        purchasesConfirmed: 0,
        purchasesReceived: 0,
        grossProfit: 0,
        operatingProfit: 0,
        avgMargin: 0,
        ivaCollected: 0,
        igtfCollected: 0,
        exchangeRate: 36.0,
        totalTransactions: 0,
        totalItems: 0
      }
    );
  }, [financeReports]);

  const formatCurrency = (amount: number) =>
    amount.toLocaleString("es-VE", { style: "currency", currency: "VES" });

  const getMarginColor = (margin: number) => {
    if (margin >= 20) return "text-state-success";
    if (margin >= 10) return "text-state-warning";
    return "text-state-error";
  };

  const getProfitColor = (profit: number) => {
    if (profit > 0) return "text-state-success";
    if (profit < 0) return "text-state-error";
    return "text-content-secondary";
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-state-info/10">
              <DollarSign className="w-5 h-5 text-state-info" />
            </div>
            <span className="text-xs font-medium text-content-tertiary uppercase tracking-wider">
              Ingresos Totales
            </span>
          </div>
          <div className="stat-value text-state-info">{formatCurrency(totals.totalSales)}</div>
          <div className="text-xs text-content-tertiary mt-1">
            {totals.totalTransactions} transacciones · {totals.totalItems} ítems
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-state-warning/10">
              <TrendingDown className="w-5 h-5 text-state-warning" />
            </div>
            <span className="text-xs font-medium text-content-tertiary uppercase tracking-wider">
              COGS
            </span>
          </div>
          <div className="stat-value text-state-warning">{formatCurrency(totals.cogs)}</div>
          <div className="text-xs text-content-tertiary mt-1">
            Costo de ventas FIFO
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-state-success/10">
              <Activity className="w-5 h-5 text-state-success" />
            </div>
            <span className="text-xs font-medium text-content-tertiary uppercase tracking-wider">
              Utilidad Operativa
            </span>
          </div>
          <div className={`stat-value ${getProfitColor(totals.operatingProfit)}`}>
            {formatCurrency(totals.operatingProfit)}
          </div>
          <div className="text-xs text-content-tertiary mt-1">
            Ventas - COGS - Compras
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-brand-500/10">
              <Percent className="w-5 h-5 text-brand-600" />
            </div>
            <span className="text-xs font-medium text-content-tertiary uppercase tracking-wider">
              Margen Neto
            </span>
          </div>
          <div className={`stat-value ${getMarginColor(totals.avgMargin)}`}>
            {totals.avgMargin.toFixed(1)}%
          </div>
          <div className="text-xs text-content-tertiary mt-1">
            Utilidad / Ingresos
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Receipt className="w-4 h-4 text-state-info" />
            <span className="text-sm font-medium text-content-secondary">Subtotal</span>
          </div>
          <div className="text-lg font-semibold text-content-primary">
            {formatCurrency(totals.subtotal)}
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-state-error" />
            <span className="text-sm font-medium text-content-secondary">IVA Recaudado</span>
          </div>
          <div className="text-lg font-semibold text-state-error">
            {formatCurrency(totals.ivaCollected)}
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart className="w-4 h-4 text-brand-600" />
            <span className="text-sm font-medium text-content-secondary">Compras Conf.</span>
          </div>
          <div className="text-lg font-semibold text-brand-600">
            {formatCurrency(totals.purchasesConfirmed)}
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-brand-600" />
            <span className="text-sm font-medium text-content-secondary">IGTF</span>
          </div>
          <div className="text-lg font-semibold text-brand-600">
            {formatCurrency(totals.igtfCollected)}
          </div>
        </div>
      </div>

      <div className="border border-surface-200 rounded-lg overflow-hidden">
        <div className="bg-surface-50 border-b border-surface-200 grid grid-cols-6 gap-2 px-4 py-3 text-xs font-semibold text-content-secondary uppercase tracking-wider">
          <div className="col-span-1">Período</div>
          <div className="col-span-1 text-right">Ingresos</div>
          <div className="col-span-1 text-right">COGS</div>
          <div className="col-span-1 text-right">Util. Oper.</div>
          <div className="col-span-1 text-right">Margen</div>
          <div className="col-span-1 text-right">Tasa USD</div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="spinner" />
            <span className="ml-3 text-content-secondary">Cargando reporte financiero...</span>
          </div>
        ) : financeReports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-content-tertiary">
            <TrendingUp className="w-8 h-8 mb-2" />
            <span>No hay datos financieros</span>
            <span className="text-xs mt-1">Genere ventas para ver el Estado de Resultados</span>
          </div>
        ) : (
          <div className="max-h-[300px] overflow-auto">
            {financeReports.map((report, idx) => (
              <div
                key={idx}
                className="grid grid-cols-6 gap-2 px-4 py-3 border-b border-surface-100 hover:bg-surface-50 transition-colors"
              >
                <div className="col-span-1 text-sm text-content-primary">{report.period}</div>
                <div className="col-span-1 text-sm text-right text-state-info">
                  {formatCurrency(report.totalSales)}
                </div>
                <div className="col-span-1 text-sm text-right text-state-warning">
                  {formatCurrency(report.cogs)}
                </div>
                <div className={`col-span-1 text-sm text-right font-medium ${getProfitColor(report.operatingProfit)}`}>
                  {formatCurrency(report.operatingProfit)}
                </div>
                <div className="col-span-1 text-sm text-right">
                  <span className={`font-medium ${getMarginColor(report.profitMarginPercent)}`}>
                    {report.profitMarginPercent.toFixed(1)}%
                  </span>
                </div>
                <div className="col-span-1 text-sm text-right text-content-secondary">
                  {report.exchangeRateUsed.toFixed(2)} Bs/USD
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
