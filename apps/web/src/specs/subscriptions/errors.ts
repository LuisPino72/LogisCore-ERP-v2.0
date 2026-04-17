export const SubscriptionErrors = {
  NOT_FOUND: {
    code: "SUBSCRIPTION_NOT_FOUND",
    message: "Suscripción no encontrada",
    retryable: false,
  },
  MAX_USERS_EXCEEDED: {
    code: "SUBSCRIPTION_MAX_USERS_EXCEEDED",
    message: "Ha alcanzado el límite de usuarios de su plan",
    retryable: false,
  },
  MAX_PRODUCTS_EXCEEDED: {
    code: "SUBSCRIPTION_MAX_PRODUCTS_EXCEEDED",
    message: "Ha alcanzado el límite de productos de su plan",
    retryable: false,
  },
  PRODUCTION_BLOCKED: {
    code: "SUBSCRIPTION_PRODUCTION_BLOCKED",
    message: "Producción no disponible en plan Basic",
    retryable: false,
  },
  EXPIRED: {
    code: "SUBSCRIPTION_EXPIRED",
    message: "Suscripción vencida o suspendida",
    retryable: false,
  },
  TRIAL_DATES_INVALID: {
    code: "SUBSCRIPTION_TRIAL_DATES_INVALID",
    message: "Período de trial inválido",
    retryable: false,
  },
  BASIC_LIMITS_VIOLATED: {
    code: "SUBSCRIPTION_BASIC_LIMITS_VIOLATED",
    message: "Límites de plan Basic violados",
    retryable: false,
  },
  PRO_LIMITS_VIOLATED: {
    code: "SUBSCRIPTION_PRO_LIMITS_VIOLATED",
    message: "Límites de plan Pro violados",
    retryable: false,
  },
  PLAN_NOT_FOUND: {
    code: "PLAN_NOT_FOUND",
    message: "Plan no encontrado",
    retryable: false,
  },
  PLAN_INACTIVE: {
    code: "PLAN_INACTIVE",
    message: "Plan inactivo",
    retryable: false,
  },
} as const;

export type SubscriptionErrorCode = keyof typeof SubscriptionErrors;