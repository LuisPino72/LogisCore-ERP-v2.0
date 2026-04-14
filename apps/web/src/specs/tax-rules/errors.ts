import type { AppError } from "@logiscore/core";

export const TAX_RULE_ERROR_CODES = {
  NAME_REQUIRED: "TAX_RULE_NAME_REQUIRED",
  RATE_INVALID: "TAX_RULE_RATE_INVALID",
  IGTF_MUST_BE_3_PERCENT: "TAX_RULE_IGTF_MUST_BE_3_PERCENT",
  TYPE_INVALID: "TAX_RULE_TYPE_INVALID",
  JURISDICTION_INVALID: "TAX_RULE_JURISDICTION_INVALID",
  TENANT_ID_MUST_BE_SLUG: "TAX_RULE_TENANT_ID_MUST_BE_SLUG",
  NOT_FOUND: "TAX_RULE_NOT_FOUND",
} as const;

export type TaxRuleErrorCode = (typeof TAX_RULE_ERROR_CODES)[keyof typeof TAX_RULE_ERROR_CODES];

export interface TaxRuleErrorContext {
  taxRuleId?: string;
  name?: string;
  rate?: number;
  type?: string;
  jurisdiction?: string;
  providedValue?: unknown;
  expectedValue?: unknown;
}

export function createTaxRuleError(
  code: TaxRuleErrorCode,
  context?: TaxRuleErrorContext
): AppError {
  const messages: Record<TaxRuleErrorCode, string> = {
    [TAX_RULE_ERROR_CODES.NAME_REQUIRED]: "El nombre de la regla fiscal es obligatorio",
    [TAX_RULE_ERROR_CODES.RATE_INVALID]: "La tasa debe estar entre 0 y 1 (0-100%)",
    [TAX_RULE_ERROR_CODES.IGTF_MUST_BE_3_PERCENT]: "IGTF debe ser exactamente 3%",
    [TAX_RULE_ERROR_CODES.TYPE_INVALID]: "Tipo de impuesto inválido",
    [TAX_RULE_ERROR_CODES.JURISDICTION_INVALID]: "Jurisdicción inválida",
    [TAX_RULE_ERROR_CODES.TENANT_ID_MUST_BE_SLUG]: "En Dexie, tenant_id debe ser slug",
    [TAX_RULE_ERROR_CODES.NOT_FOUND]: "Regla fiscal no encontrada",
  };

  return {
    code,
    message: messages[code],
    retryable: false,
    context: context as Record<string, unknown>,
  };
}

export const VALID_TAX_TYPES = ["iva", "islr", "igtf"] as const;
export const VALID_JURISDICTIONS = ["national", "regional"] as const;
export const IGTF_FIXED_RATE = 0.03;

export function validateTaxType(type: string): boolean {
  return VALID_TAX_TYPES.includes(type as typeof VALID_TAX_TYPES[number]);
}

export function validateTaxRate(rate: number): boolean {
  return rate >= 0 && rate <= 1;
}

export function validateIGTFRate(rate: number): boolean {
  return rate === IGTF_FIXED_RATE;
}

export function validateJurisdiction(jurisdiction: string): boolean {
  return VALID_JURISDICTIONS.includes(jurisdiction as typeof VALID_JURISDICTIONS[number]);
}

export function validateIGTF(type: string, rate: number): boolean {
  if (type === "igtf") {
    return rate === IGTF_FIXED_RATE;
  }
  return true;
}

export const TAX_TYPE_IVA = "iva";
export const TAX_TYPE_ISLR = "islr";
export const TAX_TYPE_IGTF = "igtf";
export const JURISDICTION_NATIONAL = "national";
export const JURISDICTION_REGIONAL = "regional";

export type ValidTaxType = typeof VALID_TAX_TYPES[number];
export type ValidJurisdiction = typeof VALID_JURISDICTIONS[number];