/**
 * Spec-Driven Development: Purchases Module
 * Validadores basados en specs/purchases/schema.json
 * Única Fuente de Verdad para el módulo de Purchases
 */

import { z } from "zod";
import { ok, err, type Result } from "@logiscore/core";
import type { AppError } from "@logiscore/core";
import {
  PURCHASE_ERROR_CODES,
  SUPPLIER_ERROR_CODES,
  PURCHASE_PRODUCT_ERROR_CODES,
  type PurchaseErrorCode,
  type SupplierErrorCode,
  type PurchaseProductErrorCode,
  createPurchaseError,
  createSupplierError,
  createPurchaseProductError,
  validateRif,
  validateWeightedQuantity,
  validateTenantId,
  RIF_PATTERN,
  PURCHASE_STATUS,
  CURRENCY,
} from "./errors";

export {
  PURCHASE_ERROR_CODES,
  SUPPLIER_ERROR_CODES,
  PURCHASE_PRODUCT_ERROR_CODES,
  type PurchaseErrorCode,
  type SupplierErrorCode,
  type PurchaseProductErrorCode,
  createPurchaseError,
  createSupplierError,
  createPurchaseProductError,
  RIF_PATTERN,
  PURCHASE_STATUS,
  CURRENCY,
};

const SLUG_REGEX = /^[a-z0-9-]+$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const purchaseItemSchema = z.object({
  product_local_id: z.string().uuid("Debe ser UUID válido"),
  qty: z.number().positive("Cantidad debe ser mayor a 0").max(999999.9999).refine(
    (val) => {
      const str = val.toFixed(4);
      return parseFloat(str) === val;
    },
    { message: "Cantidad debe tener máximo 4 decimales" }
  ),
  unit_cost: z.number().min(0).max(999999.9999).refine(
    (val) => {
      const str = val.toFixed(4);
      return parseFloat(str) === val;
    },
    { message: "Costo debe tener máximo 4 decimales" }
  ),
});

export type PurchaseItemInput = z.infer<typeof purchaseItemSchema>;

export const purchaseReceivedItemSchema = z.object({
  product_local_id: z.string().uuid(),
  qtyOrdered: z.number().min(0),
  qtyReceived: z.number().min(0),
});

export type PurchaseReceivedItemInput = z.infer<typeof purchaseReceivedItemSchema>;

export const purchaseSchema = z.object({
  local_id: z.string().uuid().optional(),
  tenant_id: z.string().regex(SLUG_REGEX, "Debe ser slug (no UUID)").optional(),
  warehouse_local_id: z.string().uuid("Bodega debe ser UUID válido"),
  supplier_local_id: z.string().uuid().nullable().optional(),
  supplier_name: z.string().max(200).nullable().optional(),
  status: z.enum(["draft", "confirmed", "partial_received", "received", "cancelled"]),
  currency: z.enum(["VES", "USD"]),
  exchange_rate: z.number().positive().max(999999.9999).refine(
    (val) => {
      const str = val.toFixed(4);
      return parseFloat(str) === val;
    },
    { message: "Tasa de cambio debe tener máximo 4 decimales" }
  ),
  subtotal: z.number().min(0).max(999999.9999).refine(
    (val) => {
      const str = val.toFixed(4);
      return parseFloat(str) === val;
    },
    { message: "Subtotal debe tener máximo 4 decimales" }
  ),
  total: z.number().min(0).max(999999.9999).refine(
    (val) => {
      const str = val.toFixed(4);
      return parseFloat(str) === val;
    },
    { message: "Total debe tener máximo 4 decimales" }
  ),
  items: z.array(purchaseItemSchema).min(1, "Al menos un item requerido"),
  received_items: z.array(purchaseReceivedItemSchema).nullable().optional(),
  created_by: z.string().nullable().optional(),
  received_at: z.string().datetime().nullable().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export type PurchaseInput = z.infer<typeof purchaseSchema>;

export const receivingItemSchema = z.object({
  product_local_id: z.string().uuid(),
  qty: z.number().positive("Cantidad debe ser mayor a 0").max(999999.9999).refine(
    (val) => {
      const str = val.toFixed(4);
      return parseFloat(str) === val;
    },
    { message: "Cantidad debe tener máximo 4 decimales" }
  ),
  isWeighted: z.boolean().optional(),
  unit_cost: z.number().min(0).max(999999.9999).refine(
    (val) => {
      const str = val.toFixed(4);
      return parseFloat(str) === val;
    },
    { message: "Costo debe tener máximo 4 decimales" }
  ),
});

export type ReceivingItemInput = z.infer<typeof receivingItemSchema>;

export const receivingSchema = z.object({
  local_id: z.string().uuid().optional(),
  tenant_id: z.string().regex(SLUG_REGEX, "Debe ser slug (no UUID)").optional(),
  purchase_local_id: z.string().uuid("Debe ser UUID válido de compra"),
  warehouse_local_id: z.string().uuid(),
  status: z.enum(["posted"]),
  items: z.array(receivingItemSchema).min(1, "Al menos un item requerido"),
  total_items: z.number().min(0),
  total_cost: z.number().min(0).refine(
    (val) => {
      const str = val.toFixed(4);
      return parseFloat(str) === val;
    },
    { message: "Costo total debe tener máximo 4 decimales" }
  ),
  received_by: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export type ReceivingInput = z.infer<typeof receivingSchema>;

export const supplierSchema = z.object({
  local_id: z.string().uuid().optional(),
  tenant_id: z.string().regex(SLUG_REGEX, "Debe ser slug (no UUID)").optional(),
  name: z.string().min(1, "Nombre obligatorio").max(200),
  rif: z.string().regex(RIF_PATTERN, "RIF inválido").nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  contact_person: z.string().max(100).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  is_active: z.boolean().default(true),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

export type SupplierInput = z.infer<typeof supplierSchema>;

export function validatePurchase(input: unknown): Result<PurchaseInput, AppError> {
  const result = purchaseSchema.safeParse(input);
  
  if (!result.success) {
    const issues = result.error.issues;
    const firstIssue = issues[0];
    
    return err(createPurchaseError(
      PURCHASE_ERROR_CODES.ITEM_INVALID,
      { 
        providedValue: firstIssue?.path?.join("."),
        fields: issues.map(i => `${i.path.join(".")}: ${i.message}`)
      }
    ));
  }
  
  return ok(result.data);
}

export function validateReceiving(input: unknown): Result<ReceivingInput, AppError> {
  const result = receivingSchema.safeParse(input);
  
  if (!result.success) {
    const issues = result.error.issues;
    const firstIssue = issues[0];
    
    return err(createPurchaseError(
      PURCHASE_ERROR_CODES.RECEIVE_NO_ITEMS,
      { 
        providedValue: firstIssue?.path?.join("."),
        fields: issues.map(i => `${i.path.join(".")}: ${i.message}`)
      }
    ));
  }
  
  return ok(result.data);
}

export function validateSupplier(input: unknown): Result<SupplierInput, AppError> {
  const result = supplierSchema.safeParse(input);
  
  if (!result.success) {
    const issues = result.error.issues;
    const firstIssue = issues[0];
    
    if (firstIssue?.message?.includes("obligatorio")) {
      return err(createSupplierError(SUPPLIER_ERROR_CODES.NAME_REQUIRED));
    }
    if (firstIssue?.path?.includes("rif")) {
      return err(createSupplierError(SUPPLIER_ERROR_CODES.RIF_INVALID, { providedRif: String(firstIssue?.message) }));
    }
    
    return err(createSupplierError(
      SUPPLIER_ERROR_CODES.NAME_REQUIRED,
      { 
        providedValue: firstIssue?.path?.join("."),
        fields: issues.map(i => `${i.path.join(".")}: ${i.message}`)
      }
    ));
  }
  
  return ok(result.data);
}

export function validatePurchaseItem(item: unknown): Result<PurchaseItemInput, AppError> {
  const result = purchaseItemSchema.safeParse(item);
  
  if (!result.success) {
    return err(createPurchaseError(
      PURCHASE_ERROR_CODES.ITEM_INVALID,
      { fields: result.error.issues.map(i => i.message) }
    ));
  }
  
  return ok(result.data);
}

export function validateReceivingItem(item: unknown, isWeighted?: boolean): Result<ReceivingItemInput, AppError> {
  const result = receivingItemSchema.safeParse(item);
  
  if (!result.success) {
    return err(createPurchaseError(
      PURCHASE_ERROR_CODES.RECEIVE_NO_ITEMS,
      { fields: result.error.issues.map(i => i.message) }
    ));
  }
  
  if (isWeighted && !validateWeightedQuantity(result.data.qty)) {
    return err(createPurchaseProductError(
      PURCHASE_PRODUCT_ERROR_CODES.WEIGHTED_QUANTITY_INVALID,
      { providedValue: result.data.qty }
    ));
  }
  
  return ok(result.data);
}

export function validatePurchaseStatusTransition(
  currentStatus: string,
  targetAction: "confirm" | "receive" | "cancel"
): Result<void, AppError> {
  switch (targetAction) {
    case "confirm":
      if (currentStatus !== PURCHASE_STATUS.DRAFT) {
        return err(createPurchaseError(PURCHASE_ERROR_CODES.NOT_DRAFT, { currentStatus }));
      }
      break;
    case "receive":
      if (currentStatus === PURCHASE_STATUS.CANCELLED) {
        return err(createPurchaseError(PURCHASE_ERROR_CODES.CANCELLED_NOT_RECEIVABLE));
      }
      if (currentStatus === PURCHASE_STATUS.RECEIVED) {
        return err(createPurchaseError(PURCHASE_ERROR_CODES.ALREADY_RECEIVED));
      }
      if (currentStatus !== PURCHASE_STATUS.CONFIRMED && currentStatus !== PURCHASE_STATUS.PARTIAL_RECEIVED) {
        return err(createPurchaseError(PURCHASE_ERROR_CODES.NOT_CONFIRMED, { currentStatus }));
      }
      break;
    case "cancel":
      if (currentStatus === PURCHASE_STATUS.RECEIVED) {
        return err(createPurchaseError(PURCHASE_ERROR_CODES.RECEIVED_NOT_CANCELLABLE));
      }
      if (currentStatus === PURCHASE_STATUS.CANCELLED) {
        return err(createPurchaseError(PURCHASE_ERROR_CODES.ALREADY_CANCELLED));
      }
      break;
  }
  
  return ok(undefined);
}

export function validateTenantIdMode(tenantId: string): Result<void, AppError> {
  if (!validateTenantId(tenantId)) {
    return err(createPurchaseError(PURCHASE_ERROR_CODES.TENANT_ID_MUST_BE_SLUG, { providedValue: tenantId }));
  }
  return ok(undefined);
}

export function validateQuantityPrecision(quantity: number, isWeighted: boolean): Result<void, AppError> {
  if (isWeighted && !validateWeightedQuantity(quantity)) {
    return err(createPurchaseProductError(
      PURCHASE_PRODUCT_ERROR_CODES.WEIGHTED_QUANTITY_INVALID,
      { providedValue: quantity }
    ));
  }
  return ok(undefined);
}

export function validateSupplierRif(rif: string | null | undefined): Result<void, AppError> {
  if (!validateRif(rif)) {
    return err(createSupplierError(
      SUPPLIER_ERROR_CODES.RIF_INVALID,
      { providedRif: rif ?? "undefined" }
    ));
  }
  return ok(undefined);
}

interface ReceivingTotalsInput {
  items: { qty: number; unitCost: number }[];
  totalItems: number;
  totalCost: number;
}

export function validateReceivingTotals(input: ReceivingTotalsInput): Result<void, AppError> {
  const calculatedTotalItems = input.items.reduce((sum, item) => sum + item.qty, 0);
  const calculatedTotalCost = input.items.reduce((sum, item) => sum + (item.qty * item.unitCost), 0);
  
  if (calculatedTotalItems !== input.totalItems || calculatedTotalCost !== input.totalCost) {
    return err(createPurchaseError(
      PURCHASE_ERROR_CODES.RECEIVING_TOTALS_MISMATCH,
      {
        providedValue: { totalItems: input.totalItems, totalCost: input.totalCost },
        expectedValue: { totalItems: calculatedTotalItems, totalCost: calculatedTotalCost }
      }
    ));
  }
  return ok(undefined);
}

export const decimalPrecision = {
  weighted: { toFixed: 4, regex: /^\d+(\.\d{1,4})?$/ },
  nonWeighted: { toFixed: 0, regex: /^\d+$/ },
  money: { toFixed: 4, regex: /^\d+(\.\d{1,4})?$/ },
} as const;