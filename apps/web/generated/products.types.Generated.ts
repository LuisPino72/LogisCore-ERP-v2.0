/**
 * Auto-generated from specs/products/schema.json
 * DO NOT EDIT - This file is generated automatically
 * 
 * Entity: Product
 * Version: 1.0.0
 * Generated: 2026-04-14T18:21:58.325Z
 */

export interface GeneratedProduct {
  local_id: string;
  tenant_id: string;
  name: string;
  sku: string;
  description: string | null;
  category_id: string | null;
  is_weighted: boolean;
  unit_of_measure: "kg" | "lb" | "gr" | "un";
  is_taxable: boolean;
  is_serialized: boolean;
  default_presentation_id: string | null;
  visible: boolean;
  deleted_at: string | null;
  created_at: string;
}

export interface GeneratedPresentation {
  id?: string;
  product_local_id: string;
  name: string;
  factor: number;
  price: number;
  barcode: string | null;
  is_default: boolean;
}

export type DecimalPrecision = {
  type: "NUMERIC(19,4)";
  calculation: number;
  display: number;
};

export const DECIMAL_PRECISION: Record<string, DecimalPrecision> = {
  money: { type: "NUMERIC(19,4)", calculation: 4, display: 2 },
  weighted_quantity: { type: "NUMERIC(19,4)", calculation: 4, display: 4 },
  non_weighted_quantity: { type: "INTEGER", calculation: 0, display: 0 },
};
