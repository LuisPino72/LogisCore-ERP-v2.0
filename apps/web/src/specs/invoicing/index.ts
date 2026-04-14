/**
 * Spec-Driven Development: Invoicing Module
 * Validadores basados en specs/invoicing/schema.json
 * Única Fuente de Verdad para el módulo de Facturación
 */

import { z } from "zod";
import { err, ok, type Result } from "@logiscore/core";
import type { AppError } from "@logiscore/core";
import {
  INVOICING_ERROR_CODES,
  createInvoicingError,
  RIF_PATTERN,
  RIF_PREFIXES,
  TAX_TYPES,
  INVOICE_STATUSES,
  CURRENCIES,
  IGTF_RATE,
  CENTS_TOLERANCE,
} from "./errors";

export {
  INVOICING_ERROR_CODES,
  createInvoicingError,
  RIF_PATTERN,
  RIF_PREFIXES,
  TAX_TYPES,
  INVOICE_STATUSES,
  CURRENCIES,
  IGTF_RATE,
  CENTS_TOLERANCE,
};

export interface ExchangeRateSnapshot {
  rate: number;
  capturedAt: string;
  source: "bcv" | "parallel" | "manual";
}

export interface TaxRuleInput {
  name: string;
  rate: number;
  type: "iva" | "islr" | "igtf";
  isWithholding?: boolean;
  isActive?: boolean;
  jurisdiction?: string;
}

export interface InvoiceRangeInput {
  prefix: string;
  startNumber: number;
  endNumber: number;
  currentNumber: number;
  controlNumberPrefix?: string;
}

export const taxRuleSchema = z.object({
  local_id: z.string().uuid().optional(),
  tenant_id: z.string().regex(/^[a-z0-9-]+$/).optional(),
  name: z.string().min(1).max(100),
  rate: z.number().min(0).max(1).refine(
    (val) => !hasMoreThan4Decimals(val),
    { message: "Tax rate debe tener máximo 4 decimales" }
  ),
  type: z.enum(TAX_TYPES),
  is_withholding: z.boolean().optional(),
  is_active: z.boolean().optional(),
  jurisdiction: z.string().optional(),
  deleted_at: z.string().datetime().nullable().optional(),
});

export const invoiceRangeSchema = z.object({
  local_id: z.string().uuid().optional(),
  tenant_id: z.string().regex(/^[a-z0-9-]+$/).optional(),
  prefix: z.string().max(20).optional(),
  start_number: z.number().int().positive(),
  end_number: z.number().int().positive(),
  current_number: z.number().int().min(0),
  control_number_prefix: z.string().max(20).optional(),
  is_active: z.boolean().optional(),
  deleted_at: z.string().datetime().nullable().optional(),
});

export type TaxRuleValidation = z.infer<typeof taxRuleSchema>;
export type InvoiceRangeValidation = z.infer<typeof invoiceRangeSchema>;

function hasMoreThan4Decimals(n: number): boolean {
  const str = n.toString();
  const decimals = str.split(".")[1]?.length ?? 0;
  return decimals > 4;
}

export function validateRif(rif: string): Result<void, AppError> {
  const normalizedRif = rif?.trim().toUpperCase() ?? "";
  
  if (!normalizedRif || normalizedRif.length === 0) {
    return err(
      createInvoicingError("RIF_INVALID", {
        providedValue: rif,
        customerRif: normalizedRif,
      })
    );
  }

  if (!RIF_PATTERN.test(normalizedRif)) {
    return err(
      createInvoicingError("RIF_INVALID", {
        providedValue: rif,
        customerRif: normalizedRif,
      })
    );
  }

  return ok(undefined);
}

export function validateInvoiceRange(
  currentNumber: number,
  endNumber: number
): Result<void, AppError> {
  if (currentNumber >= endNumber) {
    return err(
      createInvoicingError("RANGE_EXHAUSTED", {
        currentNumber,
        endNumber,
      })
    );
  }
  return ok(undefined);
}

export function validateExchangeRateSnapshot(
  snapshot: ExchangeRateSnapshot | null | undefined
): Result<void, AppError> {
  if (!snapshot) {
    return err(createInvoicingError("EXCHANGE_RATE_SNAPSHOT_MISSING"));
  }

  if (!snapshot.rate || !snapshot.capturedAt || !snapshot.source) {
    return err(
      createInvoicingError("EXCHANGE_RATE_SNAPSHOT_MISSING", {
        providedValue: snapshot,
      })
    );
  }

  return ok(undefined);
}

export function calculateIGTF(
  amountUSD: number,
  exchangeRate: number
): number {
  return amountUSD * exchangeRate * IGTF_RATE;
}

export function validateIGTF(
  payments: Array<{
    currency: string;
    method: string;
    amount: number;
  }>,
  exchangeRate: number,
  storedIGTF: number
): Result<void, AppError> {
  const foreignPayments = payments.filter(
    (p) => p.currency === "USD" && p.method !== "transfer"
  );

  const calculated = foreignPayments.reduce(
    (sum, p) => sum + calculateIGTF(p.amount, exchangeRate),
    0
  );

  if (Math.abs(calculated - storedIGTF) > CENTS_TOLERANCE) {
    return err(
      createInvoicingError("IGTF_MISMATCH", {
        calculated,
        stored: storedIGTF,
      })
    );
  }

  return ok(undefined);
}

export function validateCentsRule(total: number): Result<void, AppError> {
  const cents = Math.abs((total % 1) * 100);
  if (cents > 1) {
    return err(
      createInvoicingError("CENTS_ADJUSTMENT_NEEDED", {
        total,
        cents,
      })
    );
  }
  return ok(undefined);
}

export function applyCentsAdjustment(total: number): number {
  const cents = Math.abs((total % 1) * 100);
  if (cents <= 1) {
    return Math.floor(total * 100) / 100;
  }
  return total;
}

export function validateTenantForDexie(tenantId: string): Result<void, AppError> {
  if (!/^[a-z0-9-]+$/.test(tenantId)) {
    return err(
      createInvoicingError("TENANT_ID_MUST_BE_SLUG", {
        providedValue: tenantId,
      })
    );
  }
  return ok(undefined);
}

export function validateInvoiceNotVoided(status: string): Result<void, AppError> {
  if (status === "voided") {
    return err(createInvoicingError("ALREADY_VOIDED"));
  }
  return ok(undefined);
}

export function validateSoftDelete(
  deletedAt: string | null | undefined,
  operation: "delete"
): Result<void, AppError> {
  if (operation === "delete" && deletedAt === undefined) {
    return err(createInvoicingError("HARD_DELETE_NOT_ALLOWED"));
  }
  return ok(undefined);
}

export const DECIMAL_PRECISION = {
  MONEY: 4,
  TAX_RATE: 4,
  IGTF: 4,
} as const;

export function formatMoney(value: number): string {
  return value.toFixed(2);
}

export function formatTaxRate(value: number): string {
  return value.toFixed(2);
}
