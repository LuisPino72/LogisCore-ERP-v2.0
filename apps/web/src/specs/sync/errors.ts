export const SyncErrors = {
  TENANT_ID_MUST_BE_SLUG: {
    code: "SYNC_TENANT_ID_MUST_BE_SLUG",
    message: "En sync, tenantId debe ser slug, nunca UUID",
    retryable: false,
  },
  TENANT_TRANSLATION_FAILED: {
    code: "SYNC_TENANT_TRANSLATION_FAILED",
    message: "No se puede resolver el UUID para el tenant",
    retryable: false,
  },
  CONFLICT_DETECTED: {
    code: "SYNC_CONFLICT_DETECTED",
    message: "Conflicto de sincronización detectado",
    retryable: false,
  },
  CONFLICT_STRATEGY_INVALID: {
    code: "SYNC_CONFLICT_STRATEGY_INVALID",
    message: "Estrategia de resolución inválida para esta tabla",
    retryable: false,
  },
  SUM_MERGE_PRECISION_INVALID: {
    code: "SYNC_SUM_MERGE_PRECISION_INVALID",
    message: "Suma de cantidades debe usar máximo 4 decimales",
    retryable: false,
  },
  MAX_RETRIES_EXCEEDED: {
    code: "SYNC_MAX_RETRIES_EXCEEDED",
    message: "Máximo de reintentos excedido",
    retryable: false,
  },
  METADATA_NOT_FOUND: {
    code: "SYNC_METADATA_NOT_FOUND",
    message: "Metadatos de sincronización no encontrados",
    retryable: true,
  },
  OPERATION_FAILED: {
    code: "SYNC_OPERATION_FAILED",
    message: "Operación de sincronización fallida",
    retryable: true,
  },
} as const;

export type SyncErrorCode = keyof typeof SyncErrors;