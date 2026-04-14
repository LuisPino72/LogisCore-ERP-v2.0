/**
 * Spec-Driven Development: Exchange Rates Module
 * Validadores basados en specs/exchange-rates/schema.json
 * Única Fuente de Verdad para tasas de cambio
 */

import { z } from "zod";
import { ok, err, type Result } from "@logiscore/core";
import type { AppError } from "@logiscore/core";
import {
  EXCHANGE_RATE_ERROR_CODES,
  type ExchangeRateErrorCode,
  createExchangeRateError,
  validateCurrency,
  validateCurrencies,
  validateRate,
  validateRatePrecision,
  validateSource,
  validateDates,
  VALID_CURRENCIES,
  VALID_SOURCES,
  RATE_DECIMALS,
  CURRENCY_USD,
  CURRENCY_VES,
  SOURCE_BCV,
  SOURCE_MANUAL,
  SOURCE_PARALLEL,
  type ValidCurrency,
  type ValidSource,
} from "./errors";

export {
  EXCHANGE_RATE_ERROR_CODES,
  type ExchangeRateErrorCode,
  createExchangeRateError,
  VALID_CURRENCIES,
  VALID_SOURCES,
  RATE_DECIMALS,
  CURRENCY_USD,
  CURRENCY_VES,
  SOURCE_BCV,
  SOURCE_MANUAL,
  SOURCE_PARALLEL,
  type ValidCurrency,
  type ValidSource,
};

const SLUG_REGEX = /^[a-z0-9-]+$/;

export const exchangeRateSchema = z.object({
  id: z.string().uuid().optional(),
  tenantId: z.string().regex(SLUG_REGEX, "Debe ser slug"),
  fromCurrency: z.enum(["USD", "VES"]),
  toCurrency: z.enum(["USD", "VES"]),
  rate: z.number().positive("La tasa debe ser mayor a 0").max(999999.9999).refine(
    (val) => {
      const str = val.toFixed(RATE_DECIMALS);
      return parseFloat(str) === val;
    },
    { message: "La tasa debe tener máximo 4 decimales" }
  ),
  source: z.enum(["bcv", "manual", "parallel"]),
  jurisdiction: z.enum(["national", "regional"]).nullable().optional(),
  validFrom: z.string().datetime("Debe ser fecha UTC válida"),
  validTo: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime().optional(),
});

export type ExchangeRateInput = z.infer<typeof exchangeRateSchema>;

export const createExchangeRateSchema = exchangeRateSchema
  .omit({ id: true, createdAt: true })
  .extend({
    fromCurrency: z.enum(["USD", "VES"], {
      errorMap: () => ({ message: "Moneda origen inválida" }),
    }),
    toCurrency: z.enum(["USD", "VES"], {
      errorMap: () => ({ message: "Moneda destino inválida" }),
    }),
    source: z.enum(["bcv", "manual", "parallel"], {
      errorMap: () => ({ message: "Fuente inválida" }),
    }),
    validFrom: z.string().datetime(),
  });

export type CreateExchangeRateInput = z.infer<typeof createExchangeRateSchema>;

export const updateExchangeRateSchema = exchangeRateSchema.partial().extend({
  fromCurrency: z.enum(["USD", "VES"]).optional(),
  toCurrency: z.enum(["USD", "VES"]).optional(),
  rate: z.number().positive().max(999999.9999).refine(
    (val) => {
      const str = val.toFixed(RATE_DECIMALS);
      return parseFloat(str) === val;
    },
    { message: "La tasa debe tener máximo 4 decimales" }
  ),
  source: z.enum(["bcv", "manual", "parallel"]).optional(),
  jurisdiction: z.enum(["national", "regional"]).nullable().optional(),
  validFrom: z.string().datetime().optional(),
  validTo: z.string().datetime().nullable().optional(),
});

export type UpdateExchangeRateInput = z.infer<typeof updateExchangeRateSchema>;

export function validateExchangeRate(input: unknown): Result<ExchangeRateInput, AppError> {
  const result = exchangeRateSchema.safeParse(input);

  if (!result.success) {
    const issues = result.error.issues;
    const firstIssue = issues[0];

    return err(
      createExchangeRateError(EXCHANGE_RATE_ERROR_CODES.NOT_FOUND, {
        providedValue: firstIssue?.path?.join("."),
      })
    );
  }

  return ok(result.data);
}

export function validateExchangeRateForCreation(
  input: unknown
): Result<CreateExchangeRateInput, AppError> {
  const result = createExchangeRateSchema.safeParse(input);

  if (!result.success) {
    const issues = result.error.issues;
    const firstIssue = issues[0];

    if (firstIssue?.path?.includes("fromCurrency") || firstIssue?.path?.includes("toCurrency")) {
      return err(
        createExchangeRateError(EXCHANGE_RATE_ERROR_CODES.CURRENCY_INVALID, {
          fromCurrency: String(firstIssue?.message),
        })
      );
    }

    if (firstIssue?.path?.includes("rate")) {
      return err(
        createExchangeRateError(EXCHANGE_RATE_ERROR_CODES.INVALID, {
          rate: Number(firstIssue?.message),
        })
      );
    }

    if (firstIssue?.path?.includes("source")) {
      return err(
        createExchangeRateError(EXCHANGE_RATE_ERROR_CODES.SOURCE_INVALID, {
          source: String(firstIssue?.message),
        })
      );
    }

    return err(
      createExchangeRateError(EXCHANGE_RATE_ERROR_CODES.NOT_FOUND, {
        providedValue: firstIssue?.path?.join("."),
        expectedValue: issues.map((i) => i.message).join(", "),
      })
    );
  }

  const data = result.data;

  if (!validateCurrencies(data.fromCurrency, data.toCurrency)) {
    return err(
      createExchangeRateError(EXCHANGE_RATE_ERROR_CODES.CURRENCY_INVALID, {
        fromCurrency: data.fromCurrency,
        toCurrency: data.toCurrency,
      })
    );
  }

  if (!validateRate(data.rate)) {
    return err(
      createExchangeRateError(EXCHANGE_RATE_ERROR_CODES.INVALID, { rate: data.rate })
    );
  }

  if (!validateRatePrecision(data.rate)) {
    return err(
      createExchangeRateError(EXCHANGE_RATE_ERROR_CODES.PRECISION_INVALID, { rate: data.rate })
    );
  }

  if (!validateSource(data.source)) {
    return err(
      createExchangeRateError(EXCHANGE_RATE_ERROR_CODES.SOURCE_INVALID, { source: data.source })
    );
  }

  if (!validateDates(data.validFrom, data.validTo)) {
    return err(
      createExchangeRateError(EXCHANGE_RATE_ERROR_CODES.DATES_INVALID, {
        providedValue: data.validTo || data.validFrom,
      })
    );
  }

  return ok(data);
}

export function validateExchangeRateForUpdate(
  input: unknown
): Result<UpdateExchangeRateInput, AppError> {
  const result = updateExchangeRateSchema.safeParse(input);

  if (!result.success) {
    const issues = result.error.issues;
    const firstIssue = issues[0];

    return err(
      createExchangeRateError(EXCHANGE_RATE_ERROR_CODES.NOT_FOUND, {
        providedValue: firstIssue?.path?.join("."),
      })
    );
  }

  const data = result.data;

  if (data.fromCurrency && data.toCurrency && !validateCurrencies(data.fromCurrency, data.toCurrency)) {
    return err(
      createExchangeRateError(EXCHANGE_RATE_ERROR_CODES.CURRENCY_INVALID, {
        fromCurrency: data.fromCurrency,
        toCurrency: data.toCurrency,
      })
    );
  }

  if (data.rate && !validateRate(data.rate)) {
    return err(
      createExchangeRateError(EXCHANGE_RATE_ERROR_CODES.INVALID, { rate: data.rate })
    );
  }

  if (data.rate && !validateRatePrecision(data.rate)) {
    return err(
      createExchangeRateError(EXCHANGE_RATE_ERROR_CODES.PRECISION_INVALID, { rate: data.rate })
    );
  }

  if (data.source && !validateSource(data.source)) {
    return err(
      createExchangeRateError(EXCHANGE_RATE_ERROR_CODES.SOURCE_INVALID, { source: data.source })
    );
  }

  if (data.validFrom && data.validTo && !validateDates(data.validFrom, data.validTo)) {
    return err(
      createExchangeRateError(EXCHANGE_RATE_ERROR_CODES.DATES_INVALID)
    );
  }

  return ok(data);
}

export function validateTenantIdMode(tenantId: string): Result<void, AppError> {
  if (!SLUG_REGEX.test(tenantId)) {
    return err(
      createExchangeRateError(EXCHANGE_RATE_ERROR_CODES.TENANT_ID_MUST_BE_SLUG, {
        providedValue: tenantId,
      })
    );
  }
  return ok(undefined);
}

export function convertCurrency(amount: number, rate: number): number {
  return amount * rate;
}

export function getCurrentRate(rates: ExchangeRateInput[]): ExchangeRateInput | null {
  const now = new Date();
  return rates.find((r) => {
    const validFrom = new Date(r.validFrom);
    const validTo = r.validTo ? new Date(r.validTo) : null;
    return validFrom <= now && (!validTo || validTo >= now);
  }) || null;
}

export const exchangeRatesConfig = {
  rateDecimals: RATE_DECIMALS,
  validCurrencies: VALID_CURRENCIES,
  validSources: VALID_SOURCES,
} as const;