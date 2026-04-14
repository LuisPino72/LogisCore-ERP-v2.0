import type { AppError } from "@logiscore/core";

export const RECIPE_ERROR_CODES = {
  NOT_FOUND: "PRODUCTION_RECIPE_NOT_FOUND",
  INGREDIENTS_REQUIRED: "PRODUCTION_INGREDIENTS_REQUIRED",
  INGREDIENT_INVALID: "PRODUCTION_INGREDIENT_INVALID",
  INGREDIENT_WEIGHTED_PRECISION: "PRODUCTION_INGREDIENT_WEIGHTED_PRECISION",
  DELETED: "PRODUCTION_RECIPE_DELETED",
  TENANT_ID_MUST_BE_SLUG: "PRODUCTION_TENANT_ID_MUST_BE_SLUG",
  SOFT_DELETE: "PRODUCTION_SOFT_DELETE",
} as const;

export const PRODUCTION_ORDER_ERROR_CODES = {
  NOT_FOUND: "PRODUCTION_ORDER_NOT_FOUND",
  NOT_DRAFT: "PRODUCTION_NOT_DRAFT",
  NOT_IN_PROGRESS: "PRODUCTION_NOT_IN_PROGRESS",
  ALREADY_COMPLETED: "PRODUCTION_ALREADY_COMPLETED",
  ALREADY_CANCELLED: "PRODUCTION_ALREADY_CANCELLED",
  STATUS_INVALID: "PRODUCTION_STATUS_INVALID",
  INGREDIENT_STOCK_INSUFFICIENT: "PRODUCTION_INGREDIENT_STOCK_INSUFFICIENT",
  VARIANCE_EXCEEDED: "PRODUCTION_VARIANCE_EXCEEDED",
  TOTALS_MISMATCH: "PRODUCTION_TOTALS_MISMATCH",
  TENANT_ID_MUST_BE_SLUG: "PRODUCTION_TENANT_ID_MUST_BE_SLUG",
} as const;

export const WAREHOUSE_ERROR_CODES = {
  NOT_FOUND: "WAREHOUSE_NOT_FOUND",
  INACTIVE: "WAREHOUSE_INACTIVE",
} as const;

export type RecipeErrorCode = (typeof RECIPE_ERROR_CODES)[keyof typeof RECIPE_ERROR_CODES];
export type ProductionOrderErrorCode = (typeof PRODUCTION_ORDER_ERROR_CODES)[keyof typeof PRODUCTION_ORDER_ERROR_CODES];
export type WarehouseErrorCode = (typeof WAREHOUSE_ERROR_CODES)[keyof typeof WAREHOUSE_ERROR_CODES];

export interface RecipeErrorContext {
  recipeLocalId?: string;
  ingredientIndex?: number;
  providedValue?: unknown;
  expectedValue?: unknown;
  fields?: string[];
}

export interface ProductionErrorContext {
  orderLocalId?: string;
  currentStatus?: string;
  ingredientProductId?: string;
  availableStock?: number;
  requiredStock?: number;
  variancePercent?: number;
  maxVariance?: number;
  fields?: string[];
}

export function createRecipeError(
  code: RecipeErrorCode,
  context?: RecipeErrorContext
): AppError {
  const messages: Record<RecipeErrorCode, string> = {
    [RECIPE_ERROR_CODES.NOT_FOUND]: "La receta no existe",
    [RECIPE_ERROR_CODES.INGREDIENTS_REQUIRED]: "La receta requiere al menos un ingrediente",
    [RECIPE_ERROR_CODES.INGREDIENT_INVALID]: "Todos los ingredientes deben tener producto y cantidad > 0",
    [RECIPE_ERROR_CODES.INGREDIENT_WEIGHTED_PRECISION]: "Ingrediente pesable debe usar máximo 4 decimales",
    [RECIPE_ERROR_CODES.DELETED]: "Receta eliminada no puede usarse",
    [RECIPE_ERROR_CODES.TENANT_ID_MUST_BE_SLUG]: "En Dexie, tenant_id debe ser slug, nunca UUID",
    [RECIPE_ERROR_CODES.SOFT_DELETE]: "Hard delete no permitido",
  };

  return {
    code,
    message: messages[code],
    retryable: false,
    context: context as Record<string, unknown>,
  };
}

export function createProductionOrderError(
  code: ProductionOrderErrorCode,
  context?: ProductionErrorContext
): AppError {
  const messages: Record<ProductionOrderErrorCode, string> = {
    [PRODUCTION_ORDER_ERROR_CODES.NOT_FOUND]: "La orden de producción no existe",
    [PRODUCTION_ORDER_ERROR_CODES.NOT_DRAFT]: "Solo se pueden editar órdenes en estado borrador",
    [PRODUCTION_ORDER_ERROR_CODES.NOT_IN_PROGRESS]: "Solo se pueden completar órdenes en progreso",
    [PRODUCTION_ORDER_ERROR_CODES.ALREADY_COMPLETED]: "La orden ya fue completada",
    [PRODUCTION_ORDER_ERROR_CODES.ALREADY_CANCELLED]: "La orden ya fue cancelada",
    [PRODUCTION_ORDER_ERROR_CODES.STATUS_INVALID]: "Estado inválido para esta operación",
    [PRODUCTION_ORDER_ERROR_CODES.INGREDIENT_STOCK_INSUFFICIENT]: "Stock insuficiente de ingredientes para iniciar producción",
    [PRODUCTION_ORDER_ERROR_CODES.VARIANCE_EXCEEDED]: "Variación excede el tolerance configurado",
    [PRODUCTION_ORDER_ERROR_CODES.TOTALS_MISMATCH]: "Totales no coinciden con ingredientes utilizados",
    [PRODUCTION_ORDER_ERROR_CODES.TENANT_ID_MUST_BE_SLUG]: "En Dexie, tenant_id debe ser slug, nunca UUID",
  };

  return {
    code,
    message: messages[code],
    retryable: false,
    context: context as Record<string, unknown>,
  };
}

export function createWarehouseError(
  code: WarehouseErrorCode,
  context?: Record<string, unknown>
): AppError {
  const messages: Record<WarehouseErrorCode, string> = {
    [WAREHOUSE_ERROR_CODES.NOT_FOUND]: "La bodega no existe",
    [WAREHOUSE_ERROR_CODES.INACTIVE]: "Bodega inactiva",
  };

  return {
    code,
    message: messages[code],
    retryable: false,
    context,
  };
}

export function validateWeightedQuantity(quantity: number): boolean {
  const decimals = quantity.toString().split(".")[1]?.length ?? 0;
  return decimals <= 4;
}

export function validateTenantId(tenantId: string): boolean {
  return /^[a-z0-9-]+$/.test(tenantId);
}

export function calculateVariance(plannedQty: number, producedQty: number): number {
  if (plannedQty <= 0) return 0;
  return ((producedQty - plannedQty) / plannedQty) * 100;
}

export function isVarianceInTolerance(
  variance: number,
  tolerance: number = 10
): boolean {
  return Math.abs(variance) <= tolerance;
}

export function validateIngredientQuantity(quantity: number, isWeighted: boolean): boolean {
  if (isWeighted) {
    return validateWeightedQuantity(quantity);
  }
  return Number.isInteger(quantity) && quantity > 0;
}

export const PRODUCTION_ORDER_STATUS = {
  DRAFT: "draft",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export const PRODUCTION_VARIANCE_DEFAULT_TOLERANCE = 10;

export const DEFAULT_VARIANCE_TOLERANCE = 10;

export const STATUS_TRANSITIONS = {
  draft: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
} as const;

export function isValidStatusTransition(
  fromStatus: string,
  toStatus: string
): boolean {
  const allowed = STATUS_TRANSITIONS[fromStatus as keyof typeof STATUS_TRANSITIONS];
  return allowed?.includes(toStatus) ?? false;
}