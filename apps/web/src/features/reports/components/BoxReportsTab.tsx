import { useMemo } from "react";
import type { BoxClosingSummary } from "../types/reports.types";
import { Badge } from "@/common/components/Badge";
import { Wallet, Calendar, AlertTriangle } from "lucide-react";

interface BoxReportsTabProps {
  boxClosings: BoxClosingSummary[];
  isLoading: boolean;
}

const statusColors: Record<string, "success" | "warning" | "error"> = {
  open: "warning",
  closed: "success"
};

export function BoxReportsTab({ boxClosings, isLoading }: BoxReportsTabProps) {
  const totals = useMemo(() => {
    return boxClosings.reduce(
      (acc, box) => ({
        expected: acc.expected + Number(box.expectedAmount),
        counted: acc.counted + Number(box.countedAmount),
        difference: acc.difference + Number(box.differenceAmount),
        withDifference: box.differenceAmount !== 0 ? acc.withDifference + 1 : acc.withDifference
      }),
      { expected: 0, counted: 0, difference: 0, withDifference: 0 }
    );
  }, [boxClosings]);

  const formatCurrency = (amount: number) =>
    amount.toLocaleString("es-VE", { style: "currency", currency: "VES" });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-state-info/10">
              <Wallet className="w-5 h-5 text-state-info" />
            </div>
            <span className="text-xs font-medium text-content-tertiary uppercase tracking-wider">
              Cierres Totales
            </span>
          </div>
          <div className="stat-value text-state-info">{boxClosings.length}</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-state-success/10">
              <Calendar className="w-5 h-5 text-state-success" />
            </div>
            <span className="text-xs font-medium text-content-tertiary uppercase tracking-wider">
              Total Esperado
            </span>
          </div>
          <div className="stat-value text-state-success">{formatCurrency(totals.expected)}</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-brand-500/10">
              <Wallet className="w-5 h-5 text-brand-600" />
            </div>
            <span className="text-xs font-medium text-content-tertiary uppercase tracking-wider">
              Total Contado
            </span>
          </div>
          <div className="stat-value text-brand-600">{formatCurrency(totals.counted)}</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${totals.withDifference > 0 ? 'bg-state-error/10' : 'bg-surface-100'}`}>
              <AlertTriangle className={`w-5 h-5 ${totals.withDifference > 0 ? 'text-state-error' : 'text-content-tertiary'}`} />
            </div>
            <span className="text-xs font-medium text-content-tertiary uppercase tracking-wider">
              Con Diferencia
            </span>
          </div>
          <div className={`stat-value ${totals.withDifference > 0 ? 'text-state-error' : 'text-content-secondary'}`}>
            {totals.withDifference}
          </div>
        </div>
      </div>

      <div className="border border-surface-200 rounded-lg overflow-hidden">
        <div className="bg-surface-50 border-b border-surface-200 grid grid-cols-6 gap-2 px-4 py-3 text-xs font-semibold text-content-secondary uppercase tracking-wider">
          <div className="col-span-1">Fecha Apertura</div>
          <div className="col-span-1">Bodega</div>
          <div className="col-span-1 text-right">Esperado</div>
          <div className="col-span-1 text-right">Contado</div>
          <div className="col-span-1 text-right">Diferencia</div>
          <div className="col-span-1 text-center">Estado</div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="spinner" />
            <span className="ml-3 text-content-secondary">Cargando cierres de caja...</span>
          </div>
        ) : boxClosings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-content-tertiary">
            <Wallet className="w-8 h-8 mb-2" />
            <span>No hay cierres de caja</span>
          </div>
        ) : (
          <div className="max-h-[300px] overflow-auto">
            {boxClosings.map((box) => (
              <div
                key={box.localId}
                className="grid grid-cols-6 gap-2 px-4 py-3 border-b border-surface-100 hover:bg-surface-50 transition-colors"
              >
                <div className="col-span-1 text-sm text-content-primary">
                  {new Date(box.openedAt).toLocaleDateString("es-VE")}
                </div>
                <div className="col-span-1 text-sm text-content-secondary">
                  {box.warehouseName || box.warehouseLocalId.slice(0, 8)}
                </div>
                <div className="col-span-1 text-sm text-right text-content-secondary">
                  {formatCurrency(box.expectedAmount)}
                </div>
                <div className="col-span-1 text-sm text-right text-content-primary font-medium">
                  {formatCurrency(box.countedAmount)}
                </div>
                <div className="col-span-1 text-sm text-right">
                  <span
                    className={`font-medium ${
                      box.differenceAmount > 0
                        ? "text-state-error"
                        : box.differenceAmount < 0
                        ? "text-state-warning"
                        : "text-state-success"
                    }`}
                  >
                    {box.differenceAmount > 0 ? "+" : ""}
                    {formatCurrency(box.differenceAmount)}
                  </span>
                </div>
                <div className="col-span-1 flex justify-center">
                  <Badge variant={statusColors[box.status] || "info"}>
                    {box.status === "open" ? "Abierta" : "Cerrada"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
