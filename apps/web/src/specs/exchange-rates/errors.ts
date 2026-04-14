import type { AppError } from "@logiscore/core";

export const EXCHANGE_RATE_ERROR_CODES = {
  CURRENCY_INVALID: "EXCHANGE_RATE_CURRENCY_INVALID",
  INVALID: "EXCHANGE_RATE_INVALID",
  PRECISION_INVALID: "EXCHANGE_RATE_PRECISION_INVALID",
  SOURCE_INVALID: "EXCHANGE_RATE_SOURCE_INVALID",
  DATES_INVALID: "EXCHANGE_RATE_DATES_INVALID",
  TENANT_ID_MUST_BE_SLUG: "EXCHANGE_RATE_TENANT_ID_MUST_BE_SLUG",
  NOT_FOUND: "EXCHANGE_RATE_NOT_FOUND",
} as const;

export type ExchangeRateErrorCode = (typeof EXCHANGE_RATE_ERROR_CODES)[keyof typeof EXCHANGE_RATE_ERROR_CODES];

export interface ExchangeRateErrorContext {
  exchangeRateId?: string;
  fromCurrency?: string;
  toCurrency?: string;
  rate?: number;
  source?: string;
  providedValue?: unknown;
  expectedValue?: unknown;
}

export function createExchangeRateError(
  code: ExchangeRateErrorCode,
  context?: ExchangeRateErrorContext
): AppError {
  const messages: Record<ExchangeRateErrorCode, string> = {
    [EXCHANGE_RATE_ERROR_CODES.CURRENCY_INVALID]: "Monedas inválidas - solo USD/VES permitidas",
    [EXCHANGE_RATE_ERROR_CODES.INVALID]: "La tasa debe ser mayor a 0",
    [EXCHANGE_RATE_ERROR_CODES.PRECISION_INVALID]: "La tasa debe tener máximo 4 decimales",
    [EXCHANGE_RATE_ERROR_CODES.SOURCE_INVALID]: "Fuente de tasa inválida",
    [EXCHANGE_RATE_ERROR_CODES.DATES_INVALID]: "Fecha de fin debe ser mayor a fecha de inicio",
    [EXCHANGE_RATE_ERROR_CODES.TENANT_ID_MUST_BE_SLUG]: "En Dexie, tenant_id debe ser slug",
    [EXCHANGE_RATE_ERROR_CODES.NOT_FOUND]: "Tasa de cambio no encontrada",
  };

  return {
    code,
    message: messages[code],
    retryable: false,
    context: context as Record<string, unknown>,
  };
}

export const VALID_CURRENCIES = ["USD", "VES"] as const;
export const VALID_SOURCES = ["bcv", "manual", "parallel"] as const;
export const VALID_JURISDICTIONS = ["national", "regional"] as const;
export const RATE_DECIMALS = 4;

export function validateCurrency(currency: string): boolean {
  return VALID_CURRENCIES.includes(currency as typeof VALID_CURRENCIES[number]);
}

export function validateCurrencies(from: string, to: string): boolean {
  return from !== to && validateCurrency(from) && validateCurrency(to);
}

export function validateRate(rate: number): boolean {
  return rate > 0;
}

export function validateRatePrecision(rate: number): boolean {
  const str = rate.toFixed(RATE_DECIMALS);
  return parseFloat(str) === rate;
}

export function validateSource(source: string): boolean {
  return VALID_SOURCES.includes(source as typeof VALID_SOURCES[number]);
}

export function validateDates(validFrom: string, validTo: string | null): boolean {
  if (!validTo) return true;
  return new Date(validFrom) <= new Date(validTo);
}

export const CURRENCY_USD = "USD";
export const CURRENCY_VES = "VES";
export const SOURCE_BCV = "bcv";
export const SOURCE_MANUAL = "manual";
export const SOURCE_PARALLEL = "parallel";
export const JURISDICTION_NATIONAL = "national";
export const JURISDICTION_REGIONAL = "regional";

export type ValidCurrency = typeof VALID_CURRENCIES[number];
export type ValidSource = typeof VALID_SOURCES[number];