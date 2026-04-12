import type { CashStatus } from "../types/dashboard.types";
import { Tooltip } from "@/common";

interface CashStatusIndicatorProps {
  status: CashStatus;
  className?: string;
}

export function CashStatusIndicator({ status, className = "" }: CashStatusIndicatorProps) {
  if (status === "unknown") {
    return (
      <Tooltip content="Verifica el estado de la caja en el módulo de ventas" position="bottom">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-50 border border-surface-200 ${className}`}>
          <div className="w-2 h-2 rounded-full bg-surface-400" />
          <span className="text-xs text-content-tertiary">Estado desconocido</span>
        </div>
      </Tooltip>
    );
  }

  const isOpen = status === "open";
  const statusText = isOpen ? "Caja Abierta" : "Caja Cerrada";
  const tooltipText = isOpen 
    ? "La caja está actualmente abierta para transacciones" 
    : "La caja está cerrada. Abre una nueva caja en ventas para poder operar";

return (
      <Tooltip content={tooltipText} position="bottom">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${isOpen 
          ? "bg-state-success/5 border-state-success/10" 
          : "bg-state-error/5 border-state-error/10"} ${className}`}>
        <div className={`w-2 h-2 rounded-full ${isOpen ? "bg-state-success animate-pulse" : "bg-state-error"}`} />
        <span className={`text-xs font-medium ${isOpen ? "text-state-success/70" : "text-state-error/70"}`}>
          {statusText}
        </span>
      </div>
    </Tooltip>
  );
}
