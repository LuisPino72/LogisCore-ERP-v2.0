import { useMemo } from "react";
import type { FinanceReport } from "../types/reports.types";
import { TrendingUp, TrendingDown, Percent, DollarSign, Wallet } from "lucide-react";

interface FinanceTabProps {
  financeReports: FinanceReport[];
  isLoading: boolean;
}

export function FinanceTab({ financeReports, isLoading }: FinanceTabProps) {
  const totals = useMemo(() => {
    if (financeReports.length === 0) {
      return {
        totalSales: 0,
        totalCost: 0,
        grossProfit: 0,
        avgMargin: 0,
        totalIva: 0,
        totalIgtf: 0
      };
    }

    return financeReports.reduce(
      (acc, r) => ({
        totalSales: acc.totalSales + r.totalSales,
        totalCost: acc.totalCost + r.totalCost,
        grossProfit: acc.grossProfit + r.grossProfit,
        avgMargin: (acc.avgMargin + r.profitMarginPercent) / financeReports.length,
        totalIva: acc.totalIva + r.ivaCollected,
        totalIgtf: acc.totalIgtf + r.igtfCollected
      }),
      { totalSales: 0, totalCost: 0, grossProfit: 0, avgMargin: 0, totalIva: 0, totalIgtf: 0 }
    );
  }, [financeReports]);

  const formatCurrency = (amount: number) =>
    amount.toLocaleString("es-VE", { style: "currency", currency: "VES" });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-state-info/10">
              <DollarSign className="w-5 h-5 text-state-info" />
            </div>
            <span className="text-xs font-medium text-content-tertiary uppercase tracking-wider">
              Ventas Totales
            </span>
          </div>
          <div className="stat-value text-state-info">{formatCurrency(totals.totalSales)}</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-state-warning/10">
              <TrendingDown className="w-5 h-5 text-state-warning" />
            </div>
            <span className="text-xs font-medium text-content-tertiary uppercase tracking-wider">
              Costos
            </span>
          </div>
          <div className="stat-value text-state-warning">{formatCurrency(totals.totalCost)}</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-state-success/10">
              <TrendingUp className="w-5 h-5 text-state-success" />
            </div>
            <span className="text-xs font-medium text-content-tertiary uppercase tracking-wider">
              Utilidad Bruta
            </span>
          </div>
          <div className="stat-value text-state-success">{formatCurrency(totals.grossProfit)}</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-brand-500/10">
              <Percent className="w-5 h-5 text-brand-600" />
            </div>
            <span className="text-xs font-medium text-content-tertiary uppercase tracking-wider">
              Margen Promedio
            </span>
          </div>
          <div className="stat-value text-brand-600">{totals.avgMargin.toFixed(1)}%</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-state-error/10">
              <Wallet className="w-4 h-4 text-state-error" />
            </div>
            <span className="font-semibold text-content-primary">IVA Recaudado</span>
          </div>
          <div className="text-2xl font-bold text-state-error">
            {formatCurrency(totals.totalIva)}
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-brand-500/10">
              <Wallet className="w-4 h-4 text-brand-600" />
            </div>
            <span className="font-semibold text-content-primary">IGTF Recaudado</span>
          </div>
          <div className="text-2xl font-bold text-brand-600">
            {formatCurrency(totals.totalIgtf)}
          </div>
        </div>
      </div>

      <div className="border border-surface-200 rounded-lg overflow-hidden">
        <div className="bg-surface-50 border-b border-surface-200 grid grid-cols-6 gap-2 px-4 py-3 text-xs font-semibold text-content-secondary uppercase tracking-wider">
          <div className="col-span-1">Período</div>
          <div className="col-span-1 text-right">Ventas</div>
          <div className="col-span-1 text-right">Costo</div>
          <div className="col-span-1 text-right">Utilidad</div>
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
                  {formatCurrency(report.totalCost)}
                </div>
                <div className="col-span-1 text-sm text-right text-state-success font-medium">
                  {formatCurrency(report.grossProfit)}
                </div>
                <div className="col-span-1 text-sm text-right">
                  <span className={`font-medium ${report.profitMarginPercent >= 20 ? 'text-state-success' : report.profitMarginPercent >= 10 ? 'text-state-warning' : 'text-state-error'}`}>
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
