export const DLQErrors = {
  MAX_RETRIES_EXCEEDED: {
    code: "DLQ_MAX_RETRIES_EXCEEDED",
    message: "Máximo de reintentos alcanzado",
    retryable: false,
  },
  ALREADY_RESOLVED: {
    code: "DLQ_ALREADY_RESOLVED",
    message: "Entrada ya resuelta",
    retryable: false,
  },
  CONTEXT_MISSING: {
    code: "DLQ_CONTEXT_MISSING",
    message: "Contexto requerido",
    retryable: false,
  },
  SYNC_FAILED: {
    code: "DLQ_SYNC_FAILED",
    message: "Error en sincronización",
    retryable: true,
  },
} as const;

export type DLQErrorCode = keyof typeof DLQErrors;