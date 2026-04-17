export const ReportErrors = {
  BALANCE_SHEET_IMBALANCED: {
    code: "REPORT_BALANCE_SHEET_IMBALANCED",
    message: "El Balance General no cuadra: Activos != Pasivos + Patrimonio",
    retryable: false,
  },
  PRECISION_EXCEEDED: {
    code: "REPORT_PRECISION_EXCEEDED",
    message: "Los cálculos financieros deben usar máximo 4 decimales",
    retryable: false,
  },
  GROSS_PROFIT_MISMATCH: {
    code: "REPORT_GROSS_PROFIT_MISMATCH",
    message: "Utilidad bruta no coincide con ingresos - costo",
    retryable: false,
  },
  NET_PROFIT_MISMATCH: {
    code: "REPORT_NET_PROFIT_MISMATCH",
    message: "Utilidad neta no coincide con el cálculo",
    retryable: false,
  },
  KARDEX_FIFO_VIOLATION: {
    code: "REPORT_KARDEX_FIFO_VIOLATION",
    message: "El kardex debe usar FIFO real (lote más antiguo primero)",
    retryable: false,
  },
  NOT_FOUND: {
    code: "REPORT_NOT_FOUND",
    message: "Reporte no encontrado",
    retryable: false,
  },
  PERIOD_INVALID: {
    code: "REPORT_PERIOD_INVALID",
    message: "Período de reporte inválido",
    retryable: false,
  },
} as const;

export type ReportErrorCode = keyof typeof ReportErrors;