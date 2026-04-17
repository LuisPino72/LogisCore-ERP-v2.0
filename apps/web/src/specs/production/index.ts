/**
 * Spec-Driven Development: Production Module
 * Validadores basados en specs/production/schema.json
 * Única Fuente de Verdad para el módulo de Producción
 */

import { z } from "zod";
import { ok, err, type Result } from "@logiscore/core";
import type { AppError } from "@logiscore/core";
import {
  RECIPE_ERROR_CODES,
  PRODUCTION_ORDER_ERROR_CODES,
  WAREHOUSE_ERROR_CODES,
  type RecipeErrorCode,
  type ProductionOrderErrorCode,
  type WarehouseErrorCode,
  createRecipeError,
  createProductionOrderError,
  createWarehouseError,
  validateWeightedQuantity,
  validateTenantId,
  calculateVariance,
  isVarianceInTolerance,
  PRODUCTION_ORDER_STATUS,
  PRODUCTION_VARIANCE_DEFAULT_TOLERANCE,
  isValidStatusTransition,
} from "./errors";

export {
  RECIPE_ERROR_CODES,
  PRODUCTION_ORDER_ERROR_CODES,
  WAREHOUSE_ERROR_CODES,
  type RecipeErrorCode,
  type ProductionOrderErrorCode,
  type WarehouseErrorCode,
  PRODUCTION_ORDER_STATUS,
  PRODUCTION_VARIANCE_DEFAULT_TOLERANCE,
  calculateVariance,
  isVarianceInTolerance,
  isValidStatusTransition,
  createRecipeError,
  createProductionOrderError,
  createWarehouseError,
  validateWeightedQuantity,
  validateTenantId,
};

const SLUG_REGEX = /^[a-z0-9-]+$/;

const recipeIngredientSchema = z.object({
  product_local_id: z.string().uuid("Debe ser UUID válido"),
  qty: z.number().positive("Cantidad debe ser mayor a 0").max(999999.9999).refine(
    (val) => {
      const str = val.toFixed(4);
      return parseFloat(str) === val;
    },
    { message: "Cantidad debe tener máximo 4 decimales" }
  ),
  isWeighted: z.boolean().optional(),
});

export type RecipeIngredientInput = z.infer<typeof recipeIngredientSchema>;

export const recipeSchema = z.object({
  local_id: z.string().uuid().optional(),
  tenant_id: z.string().regex(SLUG_REGEX, "Debe ser slug (no UUID)").optional(),
  product_local_id: z.string().uuid("Producto resultante debe ser UUID válido"),
  name: z.string().min(1, "Nombre obligatorio").max(200),
  yield_qty: z.number().positive("Rendimiento debe ser mayor a 0").max(999999.9999).refine(
    (val) => {
      const str = val.toFixed(4);
      return parseFloat(str) === val;
    },
    { message: "Rendimiento debe tener máximo 4 decimales" }
  ),
  bom_version: z.string().max(20).default("1.0"),
  ingredients: z.array(recipeIngredientSchema).min(1, "Al menos un ingrediente requerido"),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export type RecipeInput = z.infer<typeof recipeSchema>;

const ingredientUsageSchema = z.object({
  product_local_id: z.string().uuid(),
  qtyPlanned: z.number().min(0).refine(
    (val) => {
      const str = val.toFixed(4);
      return parseFloat(str) === val;
    },
    { message: "Cantidad planificada debe tener máximo 4 decimales" }
  ),
  qtyUsed: z.number().min(0).refine(
    (val) => {
      const str = val.toFixed(4);
      return parseFloat(str) === val;
    },
    { message: "Cantidad usada debe tener máximo 4 decimales" }
  ),
  isWeighted: z.boolean().optional(),
  costPerUnit: z.number().min(0).optional(),
});

export type IngredientUsageInput = z.infer<typeof ingredientUsageSchema>;

export const productionOrderSchema = z.object({
  local_id: z.string().uuid().optional(),
  tenant_id: z.string().regex(SLUG_REGEX, "Debe ser slug (no UUID)").optional(),
  recipe_local_id: z.string().uuid("Receta debe ser UUID válido"),
  warehouse_local_id: z.string().uuid("Bodega debe ser UUID válido"),
  planned_qty: z.number().positive("Cantidad planificada debe ser mayor a 0").max(999999.9999).refine(
    (val) => {
      const str = val.toFixed(4);
      return parseFloat(str) === val;
    },
    { message: "Cantidad planificada debe tener máximo 4 decimales" }
  ),
  produced_qty: z.number().min(0).default(0).refine(
    (val) => {
      const str = val.toFixed(4);
      return parseFloat(str) === val;
    },
    { message: "Cantidad producida debe tener máximo 4 decimales" }
  ),
  status: z.enum(["draft", "in_progress", "completed", "cancelled"]),
  variance_percent: z.number().min(0).optional(),
  created_by: z.string().nullable().optional(),
  started_at: z.string().datetime().nullable().optional(),
  completed_at: z.string().datetime().nullable().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export type ProductionOrderInput = z.infer<typeof productionOrderSchema>;

export const productionLogSchema = z.object({
  local_id: z.string().uuid().optional(),
  tenant_id: z.string().regex(SLUG_REGEX, "Debe ser slug (no UUID)").optional(),
  production_order_local_id: z.string().uuid("Orden de producción debe ser UUID válido"),
  recipe_local_id: z.string().uuid(),
  warehouse_local_id: z.string().uuid(),
  planned_qty: z.number().min(0),
  produced_qty: z.number().min(0),
  ingredients_used: z.array(ingredientUsageSchema).min(1),
  variance_percent: z.number().min(0),
  created_by: z.string().nullable().optional(),
  created_at: z.string().datetime().optional(),
});

export type ProductionLogInput = z.infer<typeof productionLogSchema>;

export function validateRecipe(input: unknown): Result<RecipeInput, AppError> {
  const result = recipeSchema.safeParse(input);
  
  if (!result.success) {
    const issues = result.error.issues;
    const firstIssue = issues[0];
    
    if (firstIssue?.message?.includes("ingrediente")) {
      return err(createRecipeError(
        RECIPE_ERROR_CODES.INGREDIENTS_REQUIRED,
        { fields: issues.map(i => `${i.path.join(".")}: ${i.message}`) }
      ));
    }
    
    return err(createRecipeError(
      RECIPE_ERROR_CODES.INGREDIENT_INVALID,
      {
        providedValue: firstIssue?.path?.join("."),
        fields: issues.map(i => `${i.path.join(".")}: ${i.message}`)
      }
    ));
  }
  
  return ok(result.data);
}

export function validateProductionOrder(input: unknown): Result<ProductionOrderInput, AppError> {
  const result = productionOrderSchema.safeParse(input);
  
  if (!result.success) {
    const issues = result.error.issues;
    const firstIssue = issues[0];
    
    return err(createProductionOrderError(
      PRODUCTION_ORDER_ERROR_CODES.NOT_FOUND,
      {
        providedValue: firstIssue?.path?.join("."),
        fields: issues.map(i => `${i.path.join(".")}: ${i.message}`)
      }
    ));
  }
  
  return ok(result.data);
}

export function validateProductionLog(input: unknown): Result<ProductionLogInput, AppError> {
  const result = productionLogSchema.safeParse(input);
  
  if (!result.success) {
    const issues = result.error.issues;
    
    return err(createProductionOrderError(
      PRODUCTION_ORDER_ERROR_CODES.TOTALS_MISMATCH,
      { fields: issues.map(i => `${i.path.join(".")}: ${i.message}`) }
    ));
  }
  
  return ok(result.data);
}

export function validateRecipeIngredient(
  ingredient: unknown,
  isWeighted?: boolean
): Result<RecipeIngredientInput, AppError> {
  const result = recipeIngredientSchema.safeParse(ingredient);
  
  if (!result.success) {
    return err(createRecipeError(
      RECIPE_ERROR_CODES.INGREDIENT_INVALID,
      { fields: result.error.issues.map(i => i.message) }
    ));
  }
  
  if (isWeighted && !validateWeightedQuantity(result.data.qty)) {
    return err(createRecipeError(
      RECIPE_ERROR_CODES.INGREDIENT_WEIGHTED_PRECISION,
      { providedValue: result.data.qty }
    ));
  }
  
  return ok(result.data);
}

export function validateProductionStatusTransition(
  currentStatus: string,
  targetAction: "start" | "complete" | "cancel"
): Result<void, AppError> {
  switch (targetAction) {
    case "start":
      if (currentStatus !== PRODUCTION_ORDER_STATUS.DRAFT) {
        return err(createProductionOrderError(
          PRODUCTION_ORDER_ERROR_CODES.NOT_DRAFT,
          { currentStatus }
        ));
      }
      break;
    case "complete":
      if (currentStatus !== PRODUCTION_ORDER_STATUS.IN_PROGRESS) {
        return err(createProductionOrderError(
          PRODUCTION_ORDER_ERROR_CODES.NOT_IN_PROGRESS,
          { currentStatus }
        ));
      }
      break;
    case "cancel":
      if (currentStatus === PRODUCTION_ORDER_STATUS.COMPLETED) {
        return err(createProductionOrderError(
          PRODUCTION_ORDER_ERROR_CODES.ALREADY_COMPLETED
        ));
      }
      if (currentStatus === PRODUCTION_ORDER_STATUS.CANCELLED) {
        return err(createProductionOrderError(
          PRODUCTION_ORDER_ERROR_CODES.ALREADY_CANCELLED
        ));
      }
      break;
  }
  
  return ok(undefined);
}

export function validateTenantIdMode(tenantId: string): Result<void, AppError> {
  if (!validateTenantId(tenantId)) {
    return err(createRecipeError(
      RECIPE_ERROR_CODES.TENANT_ID_MUST_BE_SLUG,
      { providedValue: tenantId }
    ));
  }
  return ok(undefined);
}

export function validateVariance(
  plannedQty: number,
  producedQty: number,
  tolerance: number = PRODUCTION_VARIANCE_DEFAULT_TOLERANCE
): Result<number, AppError> {
  const variance = calculateVariance(plannedQty, producedQty);
  
  if (!isVarianceInTolerance(variance, tolerance)) {
    return err(createProductionOrderError(
      PRODUCTION_ORDER_ERROR_CODES.VARIANCE_EXCEEDED,
      {
        variancePercent: variance,
        maxVariance: tolerance
      }
    ));
  }
  
  return ok(variance);
}

export function validateIngredientStock(
  ingredientProductId: string,
  availableStock: number,
  requiredStock: number
): Result<void, AppError> {
  if (availableStock < requiredStock) {
    return err(createProductionOrderError(
      PRODUCTION_ORDER_ERROR_CODES.INGREDIENT_STOCK_INSUFFICIENT,
      {
        ingredientProductId,
        availableStock,
        requiredStock
      }
    ));
  }
  
  return ok(undefined);
}

interface ProductionTotalsInput {
  ingredients: { qtyPlanned: number; qtyUsed: number }[];
}

export function validateProductionTotals(input: ProductionTotalsInput): Result<void, AppError> {
  for (const ing of input.ingredients) {
    if (ing.qtyUsed < 0 || ing.qtyUsed > ing.qtyPlanned * 2) {
      return err(createProductionOrderError(
        PRODUCTION_ORDER_ERROR_CODES.TOTALS_MISMATCH,
        { providedValue: { qtyPlanned: ing.qtyPlanned, qtyUsed: ing.qtyUsed } }
      ));
    }
  }
  return ok(undefined);
}

export function validateWarehouseActive(isActive: boolean): Result<void, AppError> {
  if (!isActive) {
    return err(createWarehouseError(WAREHOUSE_ERROR_CODES.INACTIVE));
  }
  return ok(undefined);
}

export const decimalPrecision = {
  weighted: { toFixed: 4, regex: /^\d+(\.\d{1,4})?$/ },
  nonWeighted: { toFixed: 0, regex: /^\d+$/ },
  money: { toFixed: 4, regex: /^\d+(\.\d{1,4})?$/ },
  variance: { toFixed: 2, regex: /^\d+(\.\d{1,2})?$/ },
} as const;