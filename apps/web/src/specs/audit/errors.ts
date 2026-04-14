import type { AppError } from "@logiscore/core";

export const AUDIT_ERROR_CODES = {
  IMMUTABLE_VIOLATION: "AUDIT_IMMUTABLE_VIOLATION",
  EVENT_INVALID: "AUDIT_EVENT_INVALID",
  EVENT_NOT_WHITELISTED: "AUDIT_EVENT_NOT_WHITELISTED",
  MISSING_REQUIRED_FIELDS: "AUDIT_MISSING_REQUIRED_FIELDS",
  TIMESTAMP_INVALID: "AUDIT_TIMESTAMP_INVALID",
  DETAILS_INVALID: "AUDIT_DETAILS_INVALID",
  SCHEMA_DUAL_VIOLATION: "AUDIT_SCHEMA_DUAL_VIOLATION",
  TENANT_ID_MUST_BE_SLUG: "AUDIT_TENANT_ID_MUST_BE_SLUG",
} as const;

export type AuditErrorCode = (typeof AUDIT_ERROR_CODES)[keyof typeof AUDIT_ERROR_CODES];

export interface AuditErrorContext {
  auditId?: string;
  eventType?: string;
  targetTable?: string;
  providedValue?: unknown;
  expectedValue?: unknown;
  fields?: string[];
}

export function createAuditError(
  code: AuditErrorCode,
  context?: AuditErrorContext
): AppError {
  const messages: Record<AuditErrorCode, string> = {
    [AUDIT_ERROR_CODES.IMMUTABLE_VIOLATION]: "Los logs de auditoría son inmutables - UPDATE/DELETE prohibido",
    [AUDIT_ERROR_CODES.EVENT_INVALID]: "event_type debe seguir formato MODULO.ACCION (ej: PRODUCT.CREATED)",
    [AUDIT_ERROR_CODES.EVENT_NOT_WHITELISTED]: "Evento no permitido - debe estar en lista blanca de eventos aprobados",
    [AUDIT_ERROR_CODES.MISSING_REQUIRED_FIELDS]: "Campos obligatorios (event_type, target_table, success) no proporcionados",
    [AUDIT_ERROR_CODES.TIMESTAMP_INVALID]: "created_at debe ser timestamp UTC válido (ISO 8601)",
    [AUDIT_ERROR_CODES.DETAILS_INVALID]: "details debe ser un objeto JSON válido o null",
    [AUDIT_ERROR_CODES.SCHEMA_DUAL_VIOLATION]: "En Dexie, tenant_id debe ser slug, nunca UUID",
    [AUDIT_ERROR_CODES.TENANT_ID_MUST_BE_SLUG]: "En Dexie, tenant_id debe ser slug, nunca UUID",
  };

  return {
    code,
    message: messages[code],
    retryable: false,
    context: context as Record<string, unknown>,
  };
}

export const EVENT_TYPE_REGEX = /^[A-Z]+\.[A-Z]+$/;

export const APPROVED_EVENTS = [
  "PRODUCT.CREATED",
  "PRODUCT.UPDATED",
  "PRODUCT.DELETED",
  "SALE.COMPLETED",
  "SALE.VOIDED",
  "SALE.SUSPENDED",
  "SALE.SUSPENDED_RESTORED",
  "INVENTORY.WAREHOUSE_CREATED",
  "INVENTORY.SIZE_COLOR_CREATED",
  "INVENTORY.STOCK_MOVEMENT_RECORDED",
  "INVENTORY.COUNT_CREATED",
  "INVENTORY.COUNT_POSTED",
  "INVENTORY.REORDER_EVALUATED",
  "INVENTORY.REORDER_SUGGESTED",
  "PURCHASES.CREATED",
  "PURCHASES.RECEIVED",
  "PURCHASES.CONFIRMED",
  "PURCHASES.CANCELLED",
  "PURCHASES.UPDATED",
  "PURCHASES.SUPPLIER_CREATED",
  "PURCHASES.SUPPLIER_UPDATED",
  "PURCHASES.CATEGORY_CREATE_REQUESTED",
  "PURCHASES.PRODUCT_CREATE_REQUESTED",
  "PURCHASES.PRESENTATION_CREATE_REQUESTED",
  "INVOICE.CREATED",
  "INVOICE.ISSUED",
  "INVOICE.VOIDED",
  "PRODUCTION.RECIPE_CREATED",
  "PRODUCTION.ORDER_CREATED",
  "PRODUCTION.STARTED",
  "PRODUCTION.COMPLETED",
  "ADMIN.TENANT_CREATED",
  "ADMIN.TENANT_UPDATED",
  "ADMIN.TENANT_DELETED",
  "ADMIN.TENANT_DEACTIVATED",
  "ADMIN.SUBSCRIPTION_RENEWED",
  "ADMIN.USER_STATUS_TOGGLED",
  "ADMIN.USER_DELETED",
  "AUTH.SESSION_RESOLVED",
  "AUTH.SESSION_MISSING",
  "AUTH.SIGNED_OUT",
  "AUTH.SIGNIN_SUCCESS",
  "AUTH.SIGNIN_FAILED",
  "AUTH.RESET_PASSWORD_SENT",
  "AUTH.PASSWORD_UPDATED",
  "AUTH.WAREHOUSE_ACCESS_RESOLVED",
  "AUTH.ROLE_DETECTED",
  "CORE.BOOTSTRAP_STARTED",
  "CORE.BOOTSTRAP_COMPLETED",
  "CORE.BOOTSTRAP_FAILED",
  "CORE.CATALOGS_PULLED",
  "CATALOG.GLOBAL_PRODUCTS_HYDRATED",
  "SYNC.CONFLICT_DETECTED",
  "SYNC.CATALOG_CONFLICT_LWW",
  "SECURITY.AUDIT_LOG_REQUESTED",
  "SECURITY.AUDIT_LOG_CREATED",
  "EXCHANGE_RATE.UPDATED",
  "DASHBOARD.READY",
  "TENANT.RESOLVED",
  "SUBSCRIPTION.BLOCKED",
  "COMMISSION.CREATED",
  "SUPPLIER.PREFERRED_CREATED",
  "CREDIT.LIMIT_CREATED",
] as const;

export const APPROVED_EVENTS_SET = new Set(APPROVED_EVENTS);

export function validateEventType(eventType: string): boolean {
  return EVENT_TYPE_REGEX.test(eventType);
}

export function isEventApproved(eventType: string): boolean {
  return APPROVED_EVENTS_SET.has(eventType);
}

export function validateTenantId(tenantId: string): boolean {
  return /^[a-z0-9-]+$/.test(tenantId);
}

export function validateTimestamp(timestamp: string): boolean {
  try {
    const date = new Date(timestamp);
    return !isNaN(date.getTime()) && timestamp.endsWith("Z");
  } catch {
    return false;
  }
}

export function validateDetails(details: unknown): boolean {
  if (details === null) return true;
  if (typeof details !== "object") return false;
  return true;
}

export const AUDIT_TARGET_TABLES = [
  "products",
  "categories",
  "warehouses",
  "sales",
  "purchases",
  "receivings",
  "suppliers",
  "invoices",
  "recipes",
  "production_orders",
  "production_logs",
  "inventory_lots",
  "stock_movements",
  "inventory_counts",
  "tax_rules",
  "exchange_rates",
  "invoice_ranges",
  "users",
  "tenants",
  "audit_log_entries",
] as const;

export const AUDIT_TARGET_TABLES_SET = new Set(AUDIT_TARGET_TABLES);

export function validateTargetTable(targetTable: string): boolean {
  return AUDIT_TARGET_TABLES_SET.has(targetTable);
}