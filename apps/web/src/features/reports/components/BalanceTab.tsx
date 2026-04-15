import { useMemo } from "react";
import type { BalanceSheetReport } from "../types/reports.types";
import { TrendingDown, Percent, Building, Wallet, Scale, AlertTriangle } from "lucide-react";

interface BalanceTabProps {
  balanceReports: BalanceSheetReport[];
  isLoading: boolean;
}

export function BalanceTab({ balanceReports, isLoading }: BalanceTabProps) {
  const totals = useMemo(() => {
    if (balanceReports.length === 0) {
      return {
        totalAssets: 0,
        totalLiabilities: 0,
        netEquity: 0,
        liquidityIndex: 0,
        inventory: 0,
        cash: 0,
        accountsReceivable: 0,
        accountsPayable: 0,
        taxObligations: 0,
        balanceCheck: true
      };
    }

    return balanceReports.reduce(
      (acc, r) => ({
        totalAssets: acc.totalAssets + r.assets.total,
        totalLiabilities: acc.totalLiabilities + r.liabilities.total,
        netEquity: acc.netEquity + r.equity.total,
        liquidityIndex: (acc.liquidityIndex + r.liquidityIndex) / balanceReports.length,
        inventory: acc.inventory + r.assets.inventory,
        cash: acc.cash + r.assets.cash,
        accountsReceivable: acc.accountsReceivable + r.assets.accountsReceivable,
        accountsPayable: acc.accountsPayable + r.liabilities.accountsPayable,
        taxObligations: acc.taxObligations + r.liabilities.taxObligations,
        balanceCheck: acc.balanceCheck && r.balanceCheck
      }),
      {
        totalAssets: 0,
        totalLiabilities: 0,
        netEquity: 0,
        liquidityIndex: 0,
        inventory: 0,
        cash: 0,
        accountsReceivable: 0,
        accountsPayable: 0,
        taxObligations: 0,
        balanceCheck: true
      }
    );
  }, [balanceReports]);

  const formatCurrency = (amount: number) =>
    amount.toLocaleString("es-VE", { style: "currency", currency: "VES" });

  const getLiquidityColor = (index: number) => {
    if (index >= 2) return "text-state-success";
    if (index >= 1) return "text-state-warning";
    return "text-state-error";
  };

  const getEquityColor = (equity: number) => {
    if (equity > 0) return "text-state-success";
    if (equity < 0) return "text-state-error";
    return "text-content-secondary";
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-state-info/10">
              <Building className="w-5 h-5 text-state-info" />
            </div>
            <span className="text-xs font-medium text-content-tertiary uppercase tracking-wider">
              Total Activos
            </span>
          </div>
          <div className="stat-value text-state-info">{formatCurrency(totals.totalAssets)}</div>
          <div className="text-xs text-content-tertiary mt-1">
            Inv: {formatCurrency(totals.inventory)} · Efvo: {formatCurrency(totals.cash)} · CxC: {formatCurrency(totals.accountsReceivable)}
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-state-warning/10">
              <TrendingDown className="w-5 h-5 text-state-warning" />
            </div>
            <span className="text-xs font-medium text-content-tertiary uppercase tracking-wider">
              Total Pasivos
            </span>
          </div>
          <div className="stat-value text-state-warning">{formatCurrency(totals.totalLiabilities)}</div>
          <div className="text-xs text-content-tertiary mt-1">
            CxP: {formatCurrency(totals.accountsPayable)} · Fisc: {formatCurrency(totals.taxObligations)}
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-state-success/10">
              <Scale className="w-5 h-5 text-state-success" />
            </div>
            <span className="text-xs font-medium text-content-tertiary uppercase tracking-wider">
              Patrimonio Neto
            </span>
          </div>
          <div className={`stat-value ${getEquityColor(totals.netEquity)}`}>
            {formatCurrency(totals.netEquity)}
          </div>
          <div className="text-xs text-content-tertiary mt-1">
            Activos - Pasivos
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-brand-500/10">
              <Percent className="w-5 h-5 text-brand-600" />
            </div>
            <span className="text-xs font-medium text-content-tertiary uppercase tracking-wider">
              Índice de Liquidez
            </span>
          </div>
          <div className={`stat-value ${getLiquidityColor(totals.liquidityIndex)}`}>
            {totals.liquidityIndex.toFixed(2)}x
          </div>
          <div className="text-xs text-content-tertiary mt-1">
            Activos / Pasivos
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-state-info/10">
              <Wallet className="w-4 h-4 text-state-info" />
            </div>
            <span className="font-semibold text-content-primary">Detalle de Activos</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-content-secondary">Inventario (FIFO)</span>
              <span className="font-medium text-state-info">{formatCurrency(totals.inventory)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-content-secondary">Efectivo</span>
              <span className="font-medium text-state-info">{formatCurrency(totals.cash)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-content-secondary">Cuentas por Cobrar</span>
              <span className="font-medium text-state-info">{formatCurrency(totals.accountsReceivable)}</span>
            </div>
            <div className="border-t border-surface-200 pt-2 flex justify-between font-semibold">
              <span className="text-content-primary">Total Activos</span>
              <span className="text-state-info">{formatCurrency(totals.totalAssets)}</span>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-state-warning/10">
              <TrendingDown className="w-4 h-4 text-state-warning" />
            </div>
            <span className="font-semibold text-content-primary">Detalle de Pasivos</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-content-secondary">Cuentas por Pagar</span>
              <span className="font-medium text-state-warning">{formatCurrency(totals.accountsPayable)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-content-secondary">Obligaciones Fiscales</span>
              <span className="font-medium text-state-warning">{formatCurrency(totals.taxObligations)}</span>
            </div>
            <div className="border-t border-surface-200 pt-2 flex justify-between font-semibold">
              <span className="text-content-primary">Total Pasivos</span>
              <span className="text-state-warning">{formatCurrency(totals.totalLiabilities)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="border border-surface-200 rounded-lg overflow-hidden">
        <div className="bg-surface-50 border-b border-surface-200 grid grid-cols-5 gap-2 px-4 py-3 text-xs font-semibold text-content-secondary uppercase tracking-wider">
          <div className="col-span-1">Período</div>
          <div className="col-span-1 text-right">Activos</div>
          <div className="col-span-1 text-right">Pasivos</div>
          <div className="col-span-1 text-right">Patrimonio</div>
          <div className="col-span-1 text-right">Liquidez</div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="spinner" />
            <span className="ml-3 text-content-secondary">Cargando balance general...</span>
          </div>
        ) : balanceReports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-content-tertiary">
            <Scale className="w-8 h-8 mb-2" />
            <span>No hay datos de balance</span>
            <span className="text-xs mt-1">Genere ventas y compras para ver el balance</span>
          </div>
        ) : (
          <div className="max-h-[300px] overflow-auto">
            {balanceReports.map((report, idx) => (
              <div
                key={idx}
                className="grid grid-cols-5 gap-2 px-4 py-3 border-b border-surface-100 hover:bg-surface-50 transition-colors"
              >
                <div className="col-span-1 text-sm text-content-primary flex items-center gap-2">
                  {report.period}
                  {!report.balanceCheck && (
                    <AlertTriangle className="w-4 h-4 text-state-error" />
                  )}
                </div>
                <div className="col-span-1 text-sm text-right text-state-info">
                  {formatCurrency(report.assets.total)}
                </div>
                <div className="col-span-1 text-sm text-right text-state-warning">
                  {formatCurrency(report.liabilities.total)}
                </div>
                <div className={`col-span-1 text-sm text-right font-medium ${getEquityColor(report.equity.total)}`}>
                  {formatCurrency(report.equity.total)}
                </div>
                <div className={`col-span-1 text-sm text-right ${getLiquidityColor(report.liquidityIndex)}`}>
                  {report.liquidityIndex.toFixed(2)}x
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!totals.balanceCheck && (
        <div className="flex items-center gap-2 p-4 bg-state-error/10 border border-state-error rounded-lg">
          <AlertTriangle className="w-5 h-5 text-state-error" />
          <span className="text-sm text-state-error font-medium">
            Advertencia: El balance no cuadra. Verifique las transacciones pendientes de sincronización.
          </span>
        </div>
      )}
    </div>
  );
}