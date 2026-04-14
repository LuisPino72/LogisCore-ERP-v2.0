/**
 * Spec-Driven Development: Tax Rules Module
 * Validadores basados en specs/tax-rules/schema.json
 * Única Fuente de Verdad para reglas fiscales
 */

import { z } from "zod";
import { ok, err, type Result } from "@logiscore/core";
import type { AppError } from "@logiscore/core";
import {
  TAX_RULE_ERROR_CODES,
  type TaxRuleErrorCode,
  createTaxRuleError,
  validateTaxType,
  validateTaxRate,
  validateIGTFRate,
  validateJurisdiction,
  validateIGTF,
  VALID_TAX_TYPES,
  VALID_JURISDICTIONS,
  IGTF_FIXED_RATE,
  TAX_TYPE_IVA,
  TAX_TYPE_ISLR,
  TAX_TYPE_IGTF,
  JURISDICTION_NATIONAL,
  JURISDICTION_REGIONAL,
  type ValidTaxType,
  type ValidJurisdiction,
} from "./errors";

export {
  TAX_RULE_ERROR_CODES,
  type TaxRuleErrorCode,
  createTaxRuleError,
  VALID_TAX_TYPES,
  VALID_JURISDICTIONS,
  IGTF_FIXED_RATE,
  TAX_TYPE_IVA,
  TAX_TYPE_ISLR,
  TAX_TYPE_IGTF,
  JURISDICTION_NATIONAL,
  JURISDICTION_REGIONAL,
  type ValidTaxType,
  type ValidJurisdiction,
};

const SLUG_REGEX = /^[a-z0-9-]+$/;

export const taxRuleSchema = z.object({
  id: z.string().uuid().optional(),
  tenantId: z.string().regex(SLUG_REGEX, "Debe ser slug"),
  name: z.string().min(1, "Nombre es requerido").max(100, "Máximo 100 caracteres"),
  rate: z.number().min(0).max(1, "La tasa debe estar entre 0 y 1"),
  type: z.enum(["iva", "islr", "igtf"]),
  isWithholding: z.boolean(),
  isActive: z.boolean(),
  jurisdiction: z.enum(["national", "regional"]),
  createdAt: z.string().datetime().optional(),
});

export type TaxRuleInput = z.infer<typeof taxRuleSchema>;

export const createTaxRuleSchema = taxRuleSchema
  .omit({ id: true, createdAt: true })
  .extend({
    name: z.string().min(1, "Nombre es requerido").max(100),
    rate: z.number().min(0).max(1),
    type: z.enum(["iva", "islr", "igtf"], {
      errorMap: () => ({ message: "Tipo de impuesto inválido" }),
    }),
    jurisdiction: z.enum(["national", "regional"]),
  });

export type CreateTaxRuleInput = z.infer<typeof createTaxRuleSchema>;

export const updateTaxRuleSchema = taxRuleSchema.partial().extend({
  name: z.string().min(1).max(100).optional(),
  rate: z.number().min(0).max(1).optional(),
  type: z.enum(["iva", "islr", "igtf"]).optional(),
  jurisdiction: z.enum(["national", "regional"]).optional(),
});

export type UpdateTaxRuleInput = z.infer<typeof updateTaxRuleSchema>;

export function validateTaxRule(input: unknown): Result<TaxRuleInput, AppError> {
  const result = taxRuleSchema.safeParse(input);

  if (!result.success) {
    const issues = result.error.issues;
    const firstIssue = issues[0];

    return err(
      createTaxRuleError(TAX_RULE_ERROR_CODES.NOT_FOUND, {
        providedValue: firstIssue?.path?.join("."),
      })
    );
  }

  return ok(result.data);
}

export function validateTaxRuleForCreation(input: unknown): Result<CreateTaxRuleInput, AppError> {
  const result = createTaxRuleSchema.safeParse(input);

  if (!result.success) {
    const issues = result.error.issues;
    const firstIssue = issues[0];

    if (firstIssue?.path?.includes("name")) {
      return err(
        createTaxRuleError(TAX_RULE_ERROR_CODES.NAME_REQUIRED, {
          name: String(firstIssue.message),
        })
      );
    }

    if (firstIssue?.path?.includes("rate")) {
      return err(
        createTaxRuleError(TAX_RULE_ERROR_CODES.RATE_INVALID, {
          rate: Number(firstIssue.message),
        })
      );
    }

    if (firstIssue?.path?.includes("type")) {
      return err(
        createTaxRuleError(TAX_RULE_ERROR_CODES.TYPE_INVALID, {
          type: String(firstIssue.message),
        })
      );
    }

    return err(
      createTaxRuleError(TAX_RULE_ERROR_CODES.NOT_FOUND, {
        providedValue: firstIssue?.path?.join("."),
        expectedValue: issues.map((i) => i.message).join(", "),
      })
    );
  }

  const data = result.data;

  if (!validateTaxRate(data.rate)) {
    return err(createTaxRuleError(TAX_RULE_ERROR_CODES.RATE_INVALID, { rate: data.rate }));
  }

  if (!validateTaxType(data.type)) {
    return err(createTaxRuleError(TAX_RULE_ERROR_CODES.TYPE_INVALID, { type: data.type }));
  }

  if (!validateJurisdiction(data.jurisdiction)) {
    return err(
      createTaxRuleError(TAX_RULE_ERROR_CODES.JURISDICTION_INVALID, {
        jurisdiction: data.jurisdiction,
      })
    );
  }

  if (!validateIGTF(data.type, data.rate)) {
    return err(
      createTaxRuleError(TAX_RULE_ERROR_CODES.IGTF_MUST_BE_3_PERCENT, {
        type: data.type,
        rate: data.rate,
        expectedValue: IGTF_FIXED_RATE,
      })
    );
  }

  return ok(data);
}

export function validateTaxRuleForUpdate(input: unknown): Result<UpdateTaxRuleInput, AppError> {
  const result = updateTaxRuleSchema.safeParse(input);

  if (!result.success) {
    const issues = result.error.issues;
    const firstIssue = issues[0];

    return err(
      createTaxRuleError(TAX_RULE_ERROR_CODES.NOT_FOUND, {
        providedValue: firstIssue?.path?.join("."),
      })
    );
  }

  const data = result.data;

  if (data.rate !== undefined && !validateTaxRate(data.rate)) {
    return err(createTaxRuleError(TAX_RULE_ERROR_CODES.RATE_INVALID, { rate: data.rate }));
  }

  if (data.type !== undefined && !validateTaxType(data.type)) {
    return err(createTaxRuleError(TAX_RULE_ERROR_CODES.TYPE_INVALID, { type: data.type }));
  }

  if (data.jurisdiction !== undefined && !validateJurisdiction(data.jurisdiction)) {
    return err(
      createTaxRuleError(TAX_RULE_ERROR_CODES.JURISDICTION_INVALID, {
        jurisdiction: data.jurisdiction,
      })
    );
  }

  if (data.type !== undefined && data.rate !== undefined && !validateIGTF(data.type, data.rate)) {
    return err(
      createTaxRuleError(TAX_RULE_ERROR_CODES.IGTF_MUST_BE_3_PERCENT, {
        type: data.type,
        rate: data.rate,
      })
    );
  }

  return ok(data);
}

export function validateTenantIdMode(tenantId: string): Result<void, AppError> {
  if (!SLUG_REGEX.test(tenantId)) {
    return err(
      createTaxRuleError(TAX_RULE_ERROR_CODES.TENANT_ID_MUST_BE_SLUG, {
        providedValue: tenantId,
      })
    );
  }
  return ok(undefined);
}

export function calculateTax(subtotal: number, taxRule: TaxRuleInput): number {
  return subtotal * taxRule.rate;
}

export const taxRulesConfig = {
  maxNameLength: 100,
  minRate: 0,
  maxRate: 1,
  igtfFixedRate: IGTF_FIXED_RATE,
  validTaxTypes: VALID_TAX_TYPES,
  validJurisdictions: VALID_JURISDICTIONS,
} as const;