import type { AppError } from "@logiscore/core";

export const PRODUCT_ERROR_CODES = {
  NOT_FOUND: "PRODUCT_NOT_FOUND",
  DUPLICATE_SKU: "PRODUCT_DUPLICATE_SKU",
  SKU_INVALID: "PRODUCT_SKU_INVALID",
  WEIGHTED_PRECISION: "PRODUCT_WEIGHTED_PRECISION",
  UNIT_WEIGHTED_MISMATCH: "PRODUCT_UNIT_WEIGHTED_MISMATCH",
  UNIT_NON_WEIGHTED: "PRODUCT_UNIT_NON_WEIGHTED",
  TENANT_ID_MUST_BE_SLUG: "PRODUCT_TENANT_ID_MUST_BE_SLUG",
  DEFAULT_PRESENTATION_DUPLICATE: "PRODUCT_DEFAULT_PRESENTATION_DUPLICATE",
  BARCODE_MISSING: "PRODUCT_BARCODE_MISSING",
  SOFT_DELETE: "PRODUCT_SOFT_DELETE",
  STOCK_INSUFFICIENT: "PRODUCT_STOCK_INSUFFICIENT",
} as const;

export type ProductErrorCode = (typeof PRODUCT_ERROR_CODES)[keyof typeof PRODUCT_ERROR_CODES];

export interface ProductErrorContext {
  productId?: string;
  sku?: string;
  providedValue?: unknown;
  expectedValue?: unknown;
  fields?: string[];
}

export function createProductError(
  code: ProductErrorCode,
  context?: ProductErrorContext
): AppError {
  const messages: Record<ProductErrorCode, string> = {
    [PRODUCT_ERROR_CODES.NOT_FOUND]: "Producto no encontrado",
    [PRODUCT_ERROR_CODES.DUPLICATE_SKU]: "Ya existe un producto con este SKU",
    [PRODUCT_ERROR_CODES.SKU_INVALID]: "SKU inválido. Debe ser alphanumeric con guiones",
    [PRODUCT_ERROR_CODES.WEIGHTED_PRECISION]:
      "Producto pesable debe usar máximo 4 decimales en cantidades",
    [PRODUCT_ERROR_CODES.UNIT_WEIGHTED_MISMATCH]:
      "Producto pesable debe usar unidad de masa (kg, lb, gr)",
    [PRODUCT_ERROR_CODES.UNIT_NON_WEIGHTED]:
      "Producto no pesable debe usar unidad 'un'",
    [PRODUCT_ERROR_CODES.TENANT_ID_MUST_BE_SLUG]:
      "En Dexie, tenant_id debe ser slug, nunca UUID",
    [PRODUCT_ERROR_CODES.DEFAULT_PRESENTATION_DUPLICATE]:
      "Solo puede existir una presentación por defecto",
    [PRODUCT_ERROR_CODES.BARCODE_MISSING]:
      "Al menos una presentación debe tener barcode para operación POS",
    [PRODUCT_ERROR_CODES.SOFT_DELETE]:
      "Hard delete no permitido - usar soft delete",
    [PRODUCT_ERROR_CODES.STOCK_INSUFFICIENT]: "Stock insuficiente",
  };

  return {
    code,
    message: messages[code],
    retryable: false,
    context: context as Record<string, unknown>,
  };
}

export const WEIGHTED_UNITS = ["kg", "lb", "gr"] as const;
export const NON_WEIGHTED_UNIT = "un" as const;

export function isWeightedUnit(unit: string): boolean {
  return WEIGHTED_UNITS.includes(unit as typeof WEIGHTED_UNITS[number]);
}

export function validateWeightedQuantity(quantity: number): boolean {
  const decimals = quantity.toString().split(".")[1]?.length ?? 0;
  return decimals <= 4;
}

export function validateTenantId(tenantId: string): boolean {
  return /^[a-z0-9-]+$/.test(tenantId);
}
