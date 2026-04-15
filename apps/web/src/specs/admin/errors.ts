import type { AppError } from "@logiscore/core";

export const TENANT_ERROR_CODES = {
  RIF_INVALID: "ADMIN_TENANT_RIF_INVALID",
  SLUG_INVALID: "ADMIN_TENANT_SLUG_INVALID",
  SLUG_DUPLICATE: "ADMIN_TENANT_SLUG_DUPLICATE",
  NOT_FOUND: "ADMIN_TENANT_NOT_FOUND",
  ALREADY_ACTIVE: "ADMIN_TENANT_ALREADY_ACTIVE",
  ID_MUST_BE_SLUG: "ADMIN_TENANT_ID_MUST_BE_SLUG",
} as const;

export const USER_ERROR_CODES = {
  EMAIL_INVALID: "ADMIN_USER_EMAIL_INVALID",
  EMAIL_DUPLICATE: "ADMIN_USER_EMAIL_DUPLICATE",
  NOT_FOUND: "ADMIN_USER_NOT_FOUND",
  INVALID_ROLE: "ADMIN_USER_INVALID_ROLE",
} as const;

export const SUBSCRIPTION_ERROR_CODES = {
  STATUS_INVALID: "ADMIN_SUBSCRIPTION_STATUS_INVALID",
  NOT_FOUND: "ADMIN_SUBSCRIPTION_NOT_FOUND",
  EXPIRED: "ADMIN_SUBSCRIPTION_EXPIRED",
  DATES_INVALID: "ADMIN_SUBSCRIPTION_DATES_INVALID",
} as const;

export const PERMISSION_ERROR_CODES = {
  DENIED: "ADMIN_PERMISSION_DENIED",
  INVALID_FORMAT: "ADMIN_INVALID_PERMISSION_FORMAT",
  NOT_FOUND: "ADMIN_PERMISSION_NOT_FOUND",
  INSUFFICIENT_WAREHOUSE_ACCESS: "ADMIN_INSUFFICIENT_WAREHOUSE_ACCESS",
} as const;

export const ADMIN_ERROR_CODES = {
  ...TENANT_ERROR_CODES,
  ...USER_ERROR_CODES,
  ...SUBSCRIPTION_ERROR_CODES,
  ...PERMISSION_ERROR_CODES,
} as const;

export type AdminErrorCode = (typeof ADMIN_ERROR_CODES)[keyof typeof ADMIN_ERROR_CODES];

export interface TenantErrorContext {
  tenantId?: string;
  slug?: string;
  rif?: string;
  providedValue?: unknown;
  expectedValue?: unknown;
}

export interface UserErrorContext {
  userId?: string;
  email?: string;
  role?: string;
  providedValue?: unknown;
}

export interface SubscriptionErrorContext {
  subscriptionId?: string;
  tenantId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export function createTenantError(
  code: (typeof TENANT_ERROR_CODES)[keyof typeof TENANT_ERROR_CODES],
  context?: TenantErrorContext
): AppError {
  const messages: Record<(typeof TENANT_ERROR_CODES)[keyof typeof TENANT_ERROR_CODES], string> = {
    [TENANT_ERROR_CODES.RIF_INVALID]: "RIF debe seguir formato venezolano: 1 letra (V,J,E,G,P) + 9 dígitos",
    [TENANT_ERROR_CODES.SLUG_INVALID]: "Slug debe tener solo minúsculas, números y guiones (3-50 caracteres)",
    [TENANT_ERROR_CODES.SLUG_DUPLICATE]: "El slug ya está en uso por otro tenant",
    [TENANT_ERROR_CODES.NOT_FOUND]: "Tenant no encontrado",
    [TENANT_ERROR_CODES.ALREADY_ACTIVE]: "Tenant ya está activo",
    [TENANT_ERROR_CODES.ID_MUST_BE_SLUG]: "En Dexie, tenant_id debe ser slug, nunca UUID",
  };

  return {
    code,
    message: messages[code],
    retryable: false,
    context: context as Record<string, unknown>,
  };
}

export function createUserError(
  code: (typeof USER_ERROR_CODES)[keyof typeof USER_ERROR_CODES],
  context?: UserErrorContext
): AppError {
  const messages: Record<(typeof USER_ERROR_CODES)[keyof typeof USER_ERROR_CODES], string> = {
    [USER_ERROR_CODES.EMAIL_INVALID]: "Email debe ser un correo electrónico válido",
    [USER_ERROR_CODES.EMAIL_DUPLICATE]: "El email ya está registrado",
    [USER_ERROR_CODES.NOT_FOUND]: "Usuario no encontrado",
    [USER_ERROR_CODES.INVALID_ROLE]: "Rol debe ser 'owner' o 'employee'",
  };

  return {
    code,
    message: messages[code],
    retryable: false,
    context: context as Record<string, unknown>,
  };
}

export function createSubscriptionError(
  code: (typeof SUBSCRIPTION_ERROR_CODES)[keyof typeof SUBSCRIPTION_ERROR_CODES],
  context?: SubscriptionErrorContext
): AppError {
  const messages: Record<(typeof SUBSCRIPTION_ERROR_CODES)[keyof typeof SUBSCRIPTION_ERROR_CODES], string> = {
    [SUBSCRIPTION_ERROR_CODES.STATUS_INVALID]: "Estado de suscripción inválido",
    [SUBSCRIPTION_ERROR_CODES.NOT_FOUND]: "Suscripción no encontrada",
    [SUBSCRIPTION_ERROR_CODES.EXPIRED]: "Suscripción vencida - renovación requerida",
    [SUBSCRIPTION_ERROR_CODES.DATES_INVALID]: "Fecha de fin debe ser mayor a fecha de inicio",
  };

  return {
    code,
    message: messages[code],
    retryable: false,
    context: context as Record<string, unknown>,
  };
}

export function createAdminError(code: AdminErrorCode): AppError {
  if (code in TENANT_ERROR_CODES) {
    return createTenantError(code as (typeof TENANT_ERROR_CODES)[keyof typeof TENANT_ERROR_CODES]);
  }
  if (code in USER_ERROR_CODES) {
    return createUserError(code as (typeof USER_ERROR_CODES)[keyof typeof USER_ERROR_CODES]);
  }
  if (code in SUBSCRIPTION_ERROR_CODES) {
    return createSubscriptionError(code as (typeof SUBSCRIPTION_ERROR_CODES)[keyof typeof SUBSCRIPTION_ERROR_CODES]);
  }
  return {
    code,
    message: "Error administrativo desconocido",
    retryable: false,
  };
}

export const RIF_REGEX = /^[VJEGP]\d{9}$/;

export const TENANT_SLUG_REGEX = /^[a-z0-9-]+$/;

export const VALID_SUBSCRIPTION_STATUSES = ["active", "suspended", "expired", "trial"] as const;

export const VALID_USER_ROLES = ["owner", "employee"] as const;

export function validateRifFormat(rif: string): boolean {
  return RIF_REGEX.test(rif);
}

export function validateTenantSlug(slug: string): boolean {
  return TENANT_SLUG_REGEX.test(slug) && slug.length >= 3 && slug.length <= 50;
}

export function validateSubscriptionStatus(status: string): boolean {
  return VALID_SUBSCRIPTION_STATUSES.includes(status as typeof VALID_SUBSCRIPTION_STATUSES[number]);
}

export function validateUserRole(role: string): boolean {
  return VALID_USER_ROLES.includes(role as typeof VALID_USER_ROLES[number]);
}

export function validateEmailFormat(email: string): boolean {
  try {
    new globalThis.Email(email);
    return true;
  } catch {
    return false;
  }
}

export const SUBSCRIPTION_STATUS_ACTIVE = "active";
export const SUBSCRIPTION_STATUS_SUSPENDED = "suspended";
export const SUBSCRIPTION_STATUS_EXPIRED = "expired";
export const SUBSCRIPTION_STATUS_TRIAL = "trial";

export const USER_ROLE_OWNER = "owner";
export const USER_ROLE_EMPLOYEE = "employee";

export type ValidSubscriptionStatus = typeof VALID_SUBSCRIPTION_STATUSES[number];
export type ValidUserRole = typeof VALID_USER_ROLES[number];

export const PERMISSION_REGEX = /^[A-Z]+:[A-Z_]+$/;

export function createPermissionError(
  code: (typeof PERMISSION_ERROR_CODES)[keyof typeof PERMISSION_ERROR_CODES],
  context?: { permission?: string; required?: string; warehouseId?: string }
): AppError {
  const messages: Record<(typeof PERMISSION_ERROR_CODES)[keyof typeof PERMISSION_ERROR_CODES], string> = {
    [PERMISSION_ERROR_CODES.DENIED]: "No tiene permiso para realizar esta acción",
    [PERMISSION_ERROR_CODES.INVALID_FORMAT]: "Formato de permiso inválido. Use formato MODULO:ACCION (ej: SALES:VOID)",
    [PERMISSION_ERROR_CODES.NOT_FOUND]: "Permiso no encontrado",
    [PERMISSION_ERROR_CODES.INSUFFICIENT_WAREHOUSE_ACCESS]: "No tiene acceso al almacén requerido",
  };

  return {
    code,
    message: messages[code],
    retryable: false,
    context: context as Record<string, unknown>,
  };
}

export function validatePermissionFormat(permission: string): boolean {
  return PERMISSION_REGEX.test(permission);
}

export function validatePermissionArray(permissions: unknown): boolean {
  if (!Array.isArray(permissions)) return false;
  return permissions.every(p => typeof p === "string" && PERMISSION_REGEX.test(p));
}