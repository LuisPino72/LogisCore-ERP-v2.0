import { useMemo } from "react";
import type { CashFlowReport } from "../types/reports.types";
import { TrendingUp, TrendingDown, ArrowRightLeft, Wallet, DollarSign } from "lucide-react";

interface CashFlowTabProps {
  cashFlowReports: CashFlowReport[];
  isLoading: boolean;
}

export function CashFlowTab({ cashFlowReports, isLoading }: CashFlowTabProps) {
  const totals = useMemo(() => {
    if (cashFlowReports.length === 0) {
      return {
        initialBalance: 0,
        totalInflows: 0,
        totalOutflows: 0,
        netFlow: 0,
        finalBalance: 0,
        salesInflow: 0,
        igtfInflow: 0,
        purchasesOutflow: 0,
        igtfPaid: 0,
        expenses: 0,
        exchangeRate: 36.0
      };
    }

    return cashFlowReports.reduce(
      (acc, r) => ({
        initialBalance: acc.initialBalance + r.initialBalance,
        totalInflows: acc.totalInflows + r.inflows.total,
        totalOutflows: acc.totalOutflows + r.outflows.total,
        netFlow: acc.netFlow + r.netFlow,
        finalBalance: acc.finalBalance + r.finalBalance,
        salesInflow: acc.salesInflow + r.inflows.sales,
        igtfInflow: acc.igtfInflow + r.inflows.igtf,
        purchasesOutflow: acc.purchasesOutflow + r.outflows.purchases,
        igtfPaid: acc.igtfPaid + r.outflows.igtfPaid,
        expenses: acc.expenses + r.outflows.expenses,
        exchangeRate: r.exchangeRateUsed
      }),
      {
        initialBalance: 0,
        totalInflows: 0,
        totalOutflows: 0,
        netFlow: 0,
        finalBalance: 0,
        salesInflow: 0,
        igtfInflow: 0,
        purchasesOutflow: 0,
        igtfPaid: 0,
        expenses: 0,
        exchangeRate: 36.0
      }
    );
  }, [cashFlowReports]);

  const formatCurrency = (amount: number) =>
    amount.toLocaleString("es-VE", { style: "currency", currency: "VES", minimumFractionDigits: 2 });

  const getNetFlowColor = (flow: number) => {
    if (flow > 0) return "text-state-success";
    if (flow < 0) return "text-state-error";
    return "text-content-secondary";
  };

  const getNetFlowIcon = (flow: number) => {
    if (flow > 0) return <TrendingUp className="w-5 h-5" />;
    if (flow < 0) return <TrendingDown className="w-5 h-5" />;
    return <ArrowRightLeft className="w-5 h-5" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-state-success/10">
              <TrendingUp className="w-5 h-5 text-state-success" />
            </div>
            <span className="text-xs font-medium text-content-tertiary uppercase tracking-wider">
              Entradas Totales
            </span>
          </div>
          <div className="text-2xl font-bold text-state-success">
            {formatCurrency(totals.totalInflows)}
          </div>
          <div className="text-xs text-content-tertiary mt-1">
            Ventas: {formatCurrency(totals.salesInflow)} | IGTF: {formatCurrency(totals.igtfInflow)}
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-state-error/10">
              <TrendingDown className="w-5 h-5 text-state-error" />
            </div>
            <span className="text-xs font-medium text-content-tertiary uppercase tracking-wider">
              Salidas Totales
            </span>
          </div>
          <div className="text-2xl font-bold text-state-error">
            {formatCurrency(totals.totalOutflows)}
          </div>
          <div className="text-xs text-content-tertiary mt-1">
            Compras: {formatCurrency(totals.purchasesOutflow)} | Gastos: {formatCurrency(totals.expenses)}
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${totals.netFlow >= 0 ? "bg-state-success/10" : "bg-state-error/10"}`}>
              <div className={getNetFlowColor(totals.netFlow)}>
                {getNetFlowIcon(totals.netFlow)}
              </div>
            </div>
            <span className="text-xs font-medium text-content-tertiary uppercase tracking-wider">
              Flujo Neto
            </span>
          </div>
          <div className={`text-2xl font-bold ${getNetFlowColor(totals.netFlow)}`}>
            {formatCurrency(totals.netFlow)}
          </div>
          <div className="text-xs text-content-tertiary mt-1">
            Entradas - Salidas
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-state-info/10">
              <Wallet className="w-5 h-5 text-state-info" />
            </div>
            <span className="text-xs font-medium text-content-tertiary uppercase tracking-wider">
              Saldo Final
            </span>
          </div>
          <div className="text-2xl font-bold text-state-info">
            {formatCurrency(totals.finalBalance)}
          </div>
          <div className="text-xs text-content-tertiary mt-1">
            Inicial: {formatCurrency(totals.initialBalance)}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-content-primary mb-4">Detalle del Flujo de Caja</h3>
        
        <div className="space-y-4">
          <div className="border-b border-surface-200 pb-4">
            <h4 className="text-sm font-medium text-content-secondary mb-3">Entradas (Inflows)</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-surface-50 rounded-lg p-3">
                <div className="text-xs text-content-tertiary">Ventas</div>
                <div className="text-lg font-semibold text-state-success">
                  {formatCurrency(totals.salesInflow)}
                </div>
              </div>
              <div className="bg-surface-50 rounded-lg p-3">
                <div className="text-xs text-content-tertiary">IGTF (3%)</div>
                <div className="text-lg font-semibold text-state-success">
                  {formatCurrency(totals.igtfInflow)}
                </div>
              </div>
              <div className="bg-surface-50 rounded-lg p-3">
                <div className="text-xs text-content-tertiary">Otros</div>
                <div className="text-lg font-semibold text-content-secondary">
                  {formatCurrency(0)}
                </div>
              </div>
              <div className="bg-surface-50 rounded-lg p-3">
                <div className="text-xs text-content-tertiary font-medium">Total Entradas</div>
                <div className="text-lg font-bold text-state-success">
                  {formatCurrency(totals.totalInflows)}
                </div>
              </div>
            </div>
          </div>

          <div className="border-b border-surface-200 pb-4">
            <h4 className="text-sm font-medium text-content-secondary mb-3">Salidas (Outflows)</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-surface-50 rounded-lg p-3">
                <div className="text-xs text-content-tertiary">Compras</div>
                <div className="text-lg font-semibold text-state-error">
                  {formatCurrency(totals.purchasesOutflow)}
                </div>
              </div>
              <div className="bg-surface-50 rounded-lg p-3">
                <div className="text-xs text-content-tertiary">IGTF Pagado</div>
                <div className="text-lg font-semibold text-state-error">
                  {formatCurrency(totals.igtfPaid)}
                </div>
              </div>
              <div className="bg-surface-50 rounded-lg p-3">
                <div className="text-xs text-content-tertiary">Gastos/Ajustes</div>
                <div className="text-lg font-semibold text-state-error">
                  {formatCurrency(totals.expenses)}
                </div>
              </div>
              <div className="bg-surface-50 rounded-lg p-3">
                <div className="text-xs text-content-tertiary font-medium">Total Salidas</div>
                <div className="text-lg font-bold text-state-error">
                  {formatCurrency(totals.totalOutflows)}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <div className="flex justify-between items-center p-4 bg-surface-100 rounded-lg">
              <div className="flex items-center gap-3">
                <DollarSign className={`w-6 h-6 ${getNetFlowColor(totals.netFlow)}`} />
                <span className="text-lg font-semibold">Flujo Neto del Período</span>
              </div>
              <div className={`text-2xl font-bold ${getNetFlowColor(totals.netFlow)}`}>
                {formatCurrency(totals.netFlow)}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-surface-200">
          <div className="flex justify-between text-sm">
            <span className="text-content-tertiary">Tasa de cambio utilizada:</span>
            <span className="font-medium">{totals.exchangeRate.toFixed(2)} Bs/USD</span>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold text-content-primary mb-4">Información del Período</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-content-tertiary">Saldo Inicial:</span>
            <span className="ml-2 font-medium">{formatCurrency(totals.initialBalance)}</span>
          </div>
          <div>
            <span className="text-content-tertiary">Entradas:</span>
            <span className="ml-2 font-medium text-state-success">{formatCurrency(totals.totalInflows)}</span>
          </div>
          <div>
            <span className="text-content-tertiary">Salidas:</span>
            <span className="ml-2 font-medium text-state-error">{formatCurrency(totals.totalOutflows)}</span>
          </div>
          <div>
            <span className="text-content-tertiary">Saldo Final:</span>
            <span className="ml-2 font-medium text-state-info">{formatCurrency(totals.finalBalance)}</span>
          </div>
        </div>
      </div>

      {cashFlowReports.length === 0 && (
        <div className="text-center py-12 text-content-tertiary">
          <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No hay datos de flujo de caja para el período seleccionado.</p>
          <p className="text-sm mt-2">El flujo de caja se calcula a partir de ventas, compras y movimientos de caja.</p>
        </div>
      )}
    </div>
  );
}