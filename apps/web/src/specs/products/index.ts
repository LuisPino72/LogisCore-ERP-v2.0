/**
 * Spec-Driven Development: Products Module
 * Validadores basados en specs/products/schema.json
 * Única Fuente de Verdad para el módulo de Products
 */

import { z } from "zod";
import { ok, err, type Result } from "@logiscore/core";
import type { AppError } from "@logiscore/core";
import {
  PRODUCT_ERROR_CODES,
  type ProductErrorCode,
  createProductError,
  WEIGHTED_UNITS,
  NON_WEIGHTED_UNIT,
  validateWeightedQuantity,
  validateTenantId,
} from "./errors";

export { PRODUCT_ERROR_CODES, type ProductErrorCode, createProductError };

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG_REGEX = /^[a-z0-9-]+$/;
const SKU_REGEX = /^[A-Z0-9-]+$/;

export const productPresentationSchema = z.object({
  id: z.string().uuid().optional(),
  product_local_id: z.string().uuid(),
  name: z.string().min(1).max(50),
  factor: z.number().positive().max(999999.9999).refine(
    (val) => {
      const str = val.toFixed(4);
      return parseFloat(str) === val;
    },
    { message: "Factor debe tener máximo 4 decimales" }
  ),
  price: z.number().min(0).max(999999.9999).refine(
    (val) => {
      const str = val.toFixed(4);
      return parseFloat(str) === val;
    },
    { message: "Price debe tener máximo 4 decimales" }
  ),
  barcode: z.string().max(50).nullable().optional(),
  is_default: z.boolean(),
});

export type ProductPresentationInput = z.infer<typeof productPresentationSchema>;

export const productSchema = z.object({
  local_id: z.string().uuid().optional(),
  tenant_id: z.string().regex(SLUG_REGEX, "Debe ser slug (no UUID)").optional(),
  name: z.string().min(1).max(200),
  sku: z.string().regex(SKU_REGEX).min(1).max(50).optional(),
  description: z.string().max(1000).nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  is_weighted: z.boolean(),
  unit_of_measure: z.enum(["kg", "lb", "gr", "un"]),
  is_taxable: z.boolean(),
  is_serialized: z.boolean(),
  default_presentation_id: z.string().uuid().nullable().optional(),
  visible: z.boolean(),
  deleted_at: z.string().datetime().nullable().optional(),
  created_at: z.string().datetime().optional(),
});

export type ProductInput = z.infer<typeof productSchema>;

export function validateProduct(input: unknown): Result<ProductInput, AppError> {
  const result = productSchema.safeParse(input);
  
  if (!result.success) {
    const issues = result.error.issues;
    const firstIssue = issues[0];
    
    return err(createProductError(
      PRODUCT_ERROR_CODES.NOT_FOUND,
      { 
        providedValue: firstIssue?.path?.join("."),
        fields: issues.map(i => `${i.path.join(".")}: ${i.message}`)
      }
    ));
  }
  
  return ok(result.data);
}

export function validateProductPresentation(input: unknown): Result<ProductPresentationInput, AppError> {
  const result = productPresentationSchema.safeParse(input);
  
  if (!result.success) {
    const issues = result.error.issues;
    return err(createProductError(
      PRODUCT_ERROR_CODES.NOT_FOUND,
      { fields: issues.map(i => `${i.path.join(".")}: ${i.message}`) }
    ));
  }
  
  return ok(result.data);
}

export function validateWeightedProductRules(product: ProductInput): Result<void, AppError> {
  if (product.is_weighted) {
    if (!WEIGHTED_UNITS.includes(product.unit_of_measure as typeof WEIGHTED_UNITS[number])) {
      return err(createProductError(PRODUCT_ERROR_CODES.UNIT_WEIGHTED_MISMATCH));
    }
  } else {
    if (product.unit_of_measure !== NON_WEIGHTED_UNIT) {
      return err(createProductError(PRODUCT_ERROR_CODES.UNIT_NON_WEIGHTED));
    }
  }
  
  return ok(undefined);
}

export function validateTenantIdMode(tenantId: string): Result<void, AppError> {
  if (!validateTenantId(tenantId)) {
    return err(createProductError(PRODUCT_ERROR_CODES.TENANT_ID_MUST_BE_SLUG, { providedValue: tenantId }));
  }
  return ok(undefined);
}

export function validateQuantityPrecision(quantity: number, isWeighted: boolean): Result<void, AppError> {
  if (isWeighted && !validateWeightedQuantity(quantity)) {
    return err(createProductError(PRODUCT_ERROR_CODES.WEIGHTED_PRECISION, { providedValue: quantity }));
  }
  return ok(undefined);
}

export function validatePresentationsHaveBarcode(presentations: ProductPresentationInput[]): Result<void, AppError> {
  const hasBarcode = presentations.some(p => p.barcode && p.barcode.trim().length > 0);
  if (!hasBarcode) {
    return err(createProductError(PRODUCT_ERROR_CODES.BARCODE_MISSING));
  }
  return ok(undefined);
}

export function validateSingleDefaultPresentation(presentations: ProductPresentationInput[]): Result<void, AppError> {
  const defaults = presentations.filter(p => p.is_default);
  if (defaults.length !== 1) {
    return err(createProductError(PRODUCT_ERROR_CODES.DEFAULT_PRESENTATION_DUPLICATE, { 
      expectedValue: 1, 
      providedValue: defaults.length 
    }));
  }
  return ok(undefined);
}

export const decimalPrecision = {
  weighted: { toFixed: 4, regex: /^\d+(\.\d{1,4})?$/ },
  nonWeighted: { toFixed: 0, regex: /^\d+$/ },
  money: { toFixed: 4, regex: /^\d+(\.\d{1,4})?$/ },
} as const;
