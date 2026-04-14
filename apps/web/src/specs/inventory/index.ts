/**
 * Spec-Driven Development: Inventory Module
 * Validadores basados en specs/inventory/schema.json
 * Única Fuente de Verdad para el módulo de Inventario
 */

import { z } from "zod";
import { err, ok, type Result } from "@logiscore/core";
import type { AppError } from "@logiscore/core";
import {
  INVENTORY_ERROR_CODES,
  createInventoryError,
  hasMoreThan4Decimals,
  canBeRoundedTo4Decimals,
} from "./errors";

export { INVENTORY_ERROR_CODES, createInventoryError };

export const MOVEMENT_TYPES = [
  "purchase_in",
  "sale_out",
  "adjustment_in",
  "adjustment_out",
  "production_in",
  "production_out",
  "transfer_in",
  "transfer_out",
  "count_adjustment",
] as const;

export const stockMovementSchema = z.object({
  product_local_id: z.string().uuid(),
  warehouse_local_id: z.string().uuid(),
  movement_type: z.enum(MOVEMENT_TYPES),
  quantity: z.number().positive(),
  unit_cost: z.number().min(0).max(999999.9999).refine(
    (val) => !hasMoreThan4Decimals(val),
    { message: "Unit cost debe tener máximo 4 decimales" }
  ).optional(),
  is_weighted_product: z.boolean(),
});

export type StockMovementInput = z.infer<typeof stockMovementSchema>;

export const inventoryLotSchema = z.object({
  product_local_id: z.string().uuid(),
  warehouse_local_id: z.string().uuid(),
  quantity: z.number().positive(),
  unit_cost: z.number().min(0).max(999999.9999).refine(
    (val) => !hasMoreThan4Decimals(val),
    { message: "Unit cost debe tener máximo 4 decimales" }
  ),
  source_type: z.string().optional(),
  source_local_id: z.string().uuid().optional(),
});

export type InventoryLotInput = z.infer<typeof inventoryLotSchema>;

export const inventoryCountSchema = z.object({
  warehouse_local_id: z.string().uuid(),
  product_local_id: z.string().uuid(),
  expected_qty: z.number(),
  counted_qty: z.number(),
  is_weighted_product: z.boolean().optional(),
});

export type InventoryCountInput = z.infer<typeof inventoryCountSchema>;

export function validateStockQuantity(
  quantity: number,
  isWeighted: boolean
): Result<void, AppError> {
  if (quantity <= 0) {
    return err(createInventoryError("STOCK_MOVEMENT_QUANTITY_INVALID", { quantity }));
  }

  if (isWeighted) {
    if (quantity < 0.0001) {
      return err(createInventoryError("WEIGHTED_MOVEMENT_QUANTITY_INVALID", { 
        providedValue: quantity 
      }));
    }
    
    if (hasMoreThan4Decimals(quantity)) {
      if (!canBeRoundedTo4Decimals(quantity)) {
        return err(createInventoryError(
          "WEIGHTED_MOVEMENT_QUANTITY_INVALID",
          { providedValue: quantity }
        ));
      }
    }
  }

  return ok(undefined);
}

export function validateLotQuantity(
  quantity: number,
  isWeighted: boolean
): Result<void, AppError> {
  if (quantity <= 0) {
    return err(createInventoryError("STOCK_MOVEMENT_QUANTITY_INVALID", { quantity }));
  }

  if (isWeighted && hasMoreThan4Decimals(quantity)) {
    return err(createInventoryError(
      "WEIGHTED_MOVEMENT_QUANTITY_INVALID",
      { providedValue: quantity }
    ));
  }

  return ok(undefined);
}

export function validateUnitCost(unitCost: number): Result<void, AppError> {
  if (hasMoreThan4Decimals(unitCost)) {
    return err(createInventoryError("UNIT_COST_PRECISION_INVALID", { unitCost }));
  }
  return ok(undefined);
}

export function validateCountQuantity(
  countedQty: number,
  isWeighted: boolean
): Result<void, AppError> {
  if (isWeighted && hasMoreThan4Decimals(countedQty)) {
    return err(createInventoryError(
      "WEIGHTED_MOVEMENT_QUANTITY_INVALID",
      { providedValue: countedQty }
    ));
  }
  return ok(undefined);
}

export function validateTenantForDexie(tenantId: string): Result<void, AppError> {
  if (!/^[a-z0-9-]+$/.test(tenantId)) {
    return err(createInventoryError("TENANT_ID_MUST_BE_SLUG", { providedValue: tenantId }));
  }
  return ok(undefined);
}

export const DECIMAL_PRECISION = {
  WEIGHTED: 4,
  NON_WEIGHTED: 0,
  MONEY: 4,
} as const;

export function formatQuantity(value: number, isWeighted: boolean): string {
  return isWeighted ? value.toFixed(DECIMAL_PRECISION.WEIGHTED) : value.toFixed(DECIMAL_PRECISION.NON_WEIGHTED);
}

export function formatUnitCost(value: number): string {
  return value.toFixed(DECIMAL_PRECISION.MONEY);
}
