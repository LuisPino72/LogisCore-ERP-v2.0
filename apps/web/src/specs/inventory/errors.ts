import type { AppError } from "@logiscore/core";

export const INVENTORY_ERROR_CODES = {
  WEIGHTED_MOVEMENT_QUANTITY_INVALID: "WEIGHTED_MOVEMENT_QUANTITY_INVALID",
  UNIT_COST_PRECISION_INVALID: "UNIT_COST_PRECISION_INVALID",
  STOCK_NEGATIVE_FORBIDDEN: "STOCK_NEGATIVE_FORBIDDEN",
  TENANT_ID_MUST_BE_SLUG: "INVENTORY_TENANT_ID_MUST_BE_SLUG",
  LOT_NOT_FOUND: "INVENTORY_LOT_NOT_FOUND",
  WAREHOUSE_NOT_FOUND: "INVENTORY_WAREHOUSE_NOT_FOUND",
  STOCK_MOVEMENT_QUANTITY_INVALID: "STOCK_MOVEMENT_QUANTITY_INVALID",
  NEGATIVE_STOCK_FORBIDDEN: "NEGATIVE_STOCK_FORBIDDEN",
} as const;

export type InventoryErrorCode = keyof typeof INVENTORY_ERROR_CODES;

export interface InventoryErrorContext {
  quantity?: number;
  providedValue?: unknown;
  expectedValue?: unknown;
  currentBalance?: number;
  movementType?: string;
  unitCost?: number;
}

export function createInventoryError(
  code: InventoryErrorCode,
  context?: InventoryErrorContext
): AppError {
  const messages: Record<InventoryErrorCode, string> = {
    WEIGHTED_MOVEMENT_QUANTITY_INVALID: "Producto pesable debe usar máximo 4 decimales en cantidades",
    UNIT_COST_PRECISION_INVALID: "Costo unitario debe usar máximo 4 decimales (NUMERIC(19,4))",
    STOCK_NEGATIVE_FORBIDDEN: "Stock negativo no permitido",
    TENANT_ID_MUST_BE_SLUG: "En Dexie, tenant_id debe ser slug, nunca UUID",
    LOT_NOT_FOUND: "Lote de inventario no encontrado",
    WAREHOUSE_NOT_FOUND: "Almacén no encontrado",
    STOCK_MOVEMENT_QUANTITY_INVALID: "La cantidad debe ser mayor a cero",
    NEGATIVE_STOCK_FORBIDDEN: "El movimiento genera stock negativo y está prohibido",
  };

  return {
    code: INVENTORY_ERROR_CODES[code],
    message: messages[code] || "Error de inventario",
    retryable: false,
    context: context as Record<string, unknown>,
  };
}

export function hasMoreThan4Decimals(n: number): boolean {
  const str = n.toString();
  const decimals = str.split('.')[1]?.length ?? 0;
  return decimals > 4;
}

export function canBeRoundedTo4Decimals(n: number): boolean {
  const str = n.toString();
  const decimals = str.split('.')[1]?.length ?? 0;
  return decimals <= 5;
}

export function validateWeightedQuantity(quantity: number): boolean {
  return !hasMoreThan4Decimals(quantity);
}

export function validateTenantId(tenantId: string): boolean {
  return /^[a-z0-9-]+$/.test(tenantId);
}
