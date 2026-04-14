import type { AppError } from "@logiscore/core";

export const PURCHASE_ERROR_CODES = {
  NOT_FOUND: "PURCHASE_NOT_FOUND",
  ITEMS_REQUIRED: "PURCHASE_ITEMS_REQUIRED",
  ITEM_INVALID: "PURCHASE_ITEM_INVALID",
  NOT_DRAFT: "PURCHASE_NOT_DRAFT",
  NOT_CONFIRMED: "PURCHASE_NOT_CONFIRMED",
  CANCELLED_NOT_RECEIVABLE: "PURCHASE_CANCELLED_NOT_RECEIVABLE",
  ALREADY_RECEIVED: "PURCHASE_ALREADY_RECEIVED",
  RECEIVED_NOT_CANCELLABLE: "PURCHASE_RECEIVED_NOT_CANCELLABLE",
  ALREADY_CANCELLED: "PURCHASE_ALREADY_CANCELLED",
  RECEIVE_NO_ITEMS: "PURCHASE_RECEIVE_NO_ITEMS",
  RECEIVING_TOTALS_MISMATCH: "PURCHASE_RECEIVING_TOTALS_MISMATCH",
  WAREHOUSE_ACCESS_DENIED: "PURCHASE_WAREHOUSE_ACCESS_DENIED",
  TENANT_ID_MUST_BE_SLUG: "PURCHASE_TENANT_ID_MUST_BE_SLUG",
  SOFT_DELETE: "PURCHASE_SOFT_DELETE",
} as const;

export const SUPPLIER_ERROR_CODES = {
  NOT_FOUND: "SUPPLIER_NOT_FOUND",
  NAME_REQUIRED: "SUPPLIER_NAME_REQUIRED",
  RIF_INVALID: "SUPPLIER_RIF_INVALID",
  TENANT_ID_MUST_BE_SLUG: "SUPPLIER_TENANT_ID_MUST_BE_SLUG",
} as const;

export const PURCHASE_PRODUCT_ERROR_CODES = {
  NOT_FOUND: "PURCHASE_PRODUCT_NOT_FOUND",
  WEIGHTED_QUANTITY_INVALID: "WEIGHTED_MOVEMENT_QUANTITY_INVALID",
} as const;

export type PurchaseErrorCode = (typeof PURCHASE_ERROR_CODES)[keyof typeof PURCHASE_ERROR_CODES];
export type SupplierErrorCode = (typeof SUPPLIER_ERROR_CODES)[keyof typeof SUPPLIER_ERROR_CODES];
export type PurchaseProductErrorCode = (typeof PURCHASE_PRODUCT_ERROR_CODES)[keyof typeof PURCHASE_PRODUCT_ERROR_CODES];

export interface PurchaseErrorContext {
  purchaseLocalId?: string;
  currentStatus?: string;
  providedValue?: unknown;
  expectedValue?: unknown;
  fields?: string[];
}

export interface SupplierErrorContext {
  supplierLocalId?: string;
  providedRif?: string;
  providedValue?: unknown;
  fields?: string[];
}

export function createPurchaseError(
  code: PurchaseErrorCode,
  context?: PurchaseErrorContext
): AppError {
  const messages: Record<PurchaseErrorCode, string> = {
    [PURCHASE_ERROR_CODES.NOT_FOUND]: "La orden de compra no existe",
    [PURCHASE_ERROR_CODES.ITEMS_REQUIRED]: "La compra requiere al menos un item",
    [PURCHASE_ERROR_CODES.ITEM_INVALID]: "Todos los items deben tener producto, cantidad > 0 y costo válido",
    [PURCHASE_ERROR_CODES.NOT_DRAFT]: "Solo se pueden editar compras en estado borrador",
    [PURCHASE_ERROR_CODES.NOT_CONFIRMED]: "Solo órdenes confirmadas pueden recibir",
    [PURCHASE_ERROR_CODES.CANCELLED_NOT_RECEIVABLE]: "No se puede recibir una compra anulada",
    [PURCHASE_ERROR_CODES.ALREADY_RECEIVED]: "La compra ya fue recibida",
    [PURCHASE_ERROR_CODES.RECEIVED_NOT_CANCELLABLE]: "No se puede anular una compra ya recibida",
    [PURCHASE_ERROR_CODES.ALREADY_CANCELLED]: "La compra ya fue anulada",
    [PURCHASE_ERROR_CODES.RECEIVE_NO_ITEMS]: "Debe indicar al menos un item para recibir",
    [PURCHASE_ERROR_CODES.RECEIVING_TOTALS_MISMATCH]: "Totales no coinciden con items recibidos",
    [PURCHASE_ERROR_CODES.WAREHOUSE_ACCESS_DENIED]: "El usuario no tiene acceso a la bodega",
    [PURCHASE_ERROR_CODES.TENANT_ID_MUST_BE_SLUG]: "En Dexie, tenant_id debe ser slug, nunca UUID",
    [PURCHASE_ERROR_CODES.SOFT_DELETE]: "Hard delete no permitido",
  };

  return {
    code,
    message: messages[code],
    retryable: false,
    context: context as Record<string, unknown>,
  };
}

export function createSupplierError(
  code: SupplierErrorCode,
  context?: SupplierErrorContext
): AppError {
  const messages: Record<SupplierErrorCode, string> = {
    [SUPPLIER_ERROR_CODES.NOT_FOUND]: "El proveedor no existe",
    [SUPPLIER_ERROR_CODES.NAME_REQUIRED]: "El nombre del proveedor es obligatorio",
    [SUPPLIER_ERROR_CODES.RIF_INVALID]: "RIF inválido. Formato requerido: V012345678, J012345678, G012345678, E012345678 o P012345678 (10 caracteres)",
    [SUPPLIER_ERROR_CODES.TENANT_ID_MUST_BE_SLUG]: "En Dexie, tenant_id debe ser slug, nunca UUID",
  };

  return {
    code,
    message: messages[code],
    retryable: false,
    context: context as Record<string, unknown>,
  };
}

export function createPurchaseProductError(
  code: PurchaseProductErrorCode,
  context?: PurchaseErrorContext
): AppError {
  const messages: Record<PurchaseProductErrorCode, string> = {
    [PURCHASE_PRODUCT_ERROR_CODES.NOT_FOUND]: "El producto no existe",
    [PURCHASE_PRODUCT_ERROR_CODES.WEIGHTED_QUANTITY_INVALID]: "Producto pesable debe usar máximo 4 decimales",
  };

  return {
    code,
    message: messages[code],
    retryable: false,
    context: context as Record<string, unknown>,
  };
}

export const RIF_PATTERN = /^[VJEGP]\d{9}$/;

export function validateRif(rif: string | null | undefined): boolean {
  if (!rif) return true;
  return RIF_PATTERN.test(rif);
}

export function validateWeightedQuantity(quantity: number): boolean {
  const decimals = quantity.toString().split(".")[1]?.length ?? 0;
  return decimals <= 4;
}

export function validateTenantId(tenantId: string): boolean {
  return /^[a-z0-9-]+$/.test(tenantId);
}

export function isWeightedUnit(unit: string): boolean {
  return ["kg", "lb", "gr"].includes(unit);
}

export const PURCHASE_STATUS = {
  DRAFT: "draft",
  CONFIRMED: "confirmed",
  PARTIAL_RECEIVED: "partial_received",
  RECEIVED: "received",
  CANCELLED: "cancelled",
} as const;

export const CURRENCY = {
  VES: "VES",
  USD: "USD",
} as const;