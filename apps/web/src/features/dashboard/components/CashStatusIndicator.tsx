import type { CashStatus } from "../types/dashboard.types";

interface CashStatusIndicatorProps {
  status: CashStatus;
  className?: string;
}

export function CashStatusIndicator({ status, className = "" }: CashStatusIndicatorProps) {
  if (status === "unknown") {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-50 border border-surface-200 ${className}`}>
        <div className="w-2 h-2 rounded-full bg-surface-400" />
        <span className="text-xs text-content-tertiary">Estado desconocido</span>
      </div>
    );
  }

  const isOpen = status === "open";

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${isOpen 
      ? "bg-emerald-50 border-emerald-200" 
      : "bg-red-50 border-red-200"} ${className}`}>
      <div className={`w-2 h-2 rounded-full ${isOpen ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
      <span className={`text-xs font-medium ${isOpen ? "text-emerald-700" : "text-red-700"}`}>
        Caja {isOpen ? "Abierta" : "Cerrada"}
      </span>
    </div>
  );
}
