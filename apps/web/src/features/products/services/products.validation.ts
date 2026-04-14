/**
 * Product Validation Hook - Integración SDD en ProductsService
 * Valida inputs usando los schemas de specs/products/index.ts
 */

import { err, ok, type Result } from "@logiscore/core";
import type { AppError } from "@logiscore/core";
import {
  validateProduct,
  validateProductPresentation,
  validateWeightedProductRules,
  validateTenantIdMode,
  validateQuantityPrecision,
  PRODUCT_ERROR_CODES,
  createProductError,
} from "../../../specs/products";

import type { CreateProductInput, CreateProductPresentationInput } from "../types/products.types";

export interface ProductValidationResult {
  isValid: boolean;
  errors: AppError[];
}

export function validateProductInput(input: CreateProductInput): Result<{
  tenantId: string;
  name: string;
  sku: string;
  isWeighted: boolean;
  unitOfMeasure: string;
}, AppError> {
  const normalizedInput = {
    name: input.name,
    sku: input.sku,
    description: input.description ?? null,
    category_id: input.categoryId ?? null,
    is_weighted: input.isWeighted ?? false,
    unit_of_measure: input.unitOfMeasure ?? "un",
    is_taxable: input.isTaxable ?? true,
    is_serialized: input.isSerialized ?? false,
    default_presentation_id: input.defaultPresentationId ?? null,
    visible: input.visible ?? false,
  };

  const validationResult = validateProduct(normalizedInput);
  if (!validationResult.ok) {
    return err(validationResult.error);
  }

  const validated = validationResult.data;
  const rulesResult = validateWeightedProductRules(validated);
  if (!rulesResult.ok) {
    return err(rulesResult.error);
  }

  return ok({
    tenantId: validated.tenant_id,
    name: validated.name,
    sku: validated.sku,
    isWeighted: validated.is_weighted,
    unitOfMeasure: validated.unit_of_measure,
  });
}

export function validateProductSku(sku: string): Result<void, AppError> {
  const SKU_REGEX = /^[A-Z0-9-]+$/;
  
  if (!sku || sku.trim().length === 0) {
    return err(createProductError(PRODUCT_ERROR_CODES.SKU_INVALID, { 
      providedValue: sku,
      expectedValue: "non-empty string"
    }));
  }
  
  if (!SKU_REGEX.test(sku)) {
    return err(createProductError(PRODUCT_ERROR_CODES.SKU_INVALID, {
      providedValue: sku,
      expectedValue: "^[A-Z0-9-]+$"
    }));
  }
  
  return ok(undefined);
}

export function validateTenantForDexie(tenantId: string): Result<void, AppError> {
  return validateTenantIdMode(tenantId);
}

export function validateWeightedProduct(
  isWeighted: boolean | null | undefined,
  unitOfMeasure: string | null | undefined
): Result<void, AppError> {
  const normalized = {
    local_id: "temp",
    tenant_id: "test-tenant",
    name: "Test",
    sku: "TEST-001",
    is_weighted: isWeighted ?? false,
    unit_of_measure: unitOfMeasure ?? "un",
  };
  
  const validationResult = validateProduct(normalized);
  if (!validationResult.ok) {
    return err(validationResult.error);
  }
  
  return validateWeightedProductRules(validationResult.data);
}

export function validateStockQuantity(
  quantity: number,
  isWeighted: boolean
): Result<void, AppError> {
  return validateQuantityPrecision(quantity, isWeighted);
}

export function validatePresentationInput(
  input: CreateProductPresentationInput
): Result<void, AppError> {
  const normalized = {
    product_local_id: input.productLocalId,
    name: input.name,
    factor: input.factor,
    price: input.price ?? 0,
    barcode: input.barcode ?? null,
    is_default: input.isDefault ?? false,
  };
  
  const validationResult = validateProductPresentation(normalized);
  if (!validationResult.ok) {
    return err(validationResult.error);
  }
  
  return ok(undefined);
}

export function validatePresentationsBulk(
  presentations: Array<{
    name: string;
    factor: number;
    price?: number;
    barcode?: string;
    isDefault?: boolean;
  }>
): Result<void, AppError> {
  if (presentations.length === 0) {
    return ok(undefined);
  }
  
  const normalized = presentations.map(p => ({
    product_local_id: "temp",
    name: p.name,
    factor: p.factor,
    price: p.price ?? 0,
    barcode: p.barcode ?? null,
    is_default: p.isDefault ?? false,
  }));
  
  const uniqueDefaults = normalized.filter(p => p.is_default);
  if (uniqueDefaults.length !== 1) {
    return err(createProductError(PRODUCT_ERROR_CODES.DEFAULT_PRESENTATION_DUPLICATE, {
      providedValue: uniqueDefaults.length,
      expectedValue: 1,
    }));
  }
  
  const hasBarcode = normalized.some(p => p.barcode && p.barcode.trim().length > 0);
  if (!hasBarcode) {
    return err(createProductError(PRODUCT_ERROR_CODES.BARCODE_MISSING));
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

export function formatMoney(value: number): string {
  return value.toFixed(2);
}
