import type { AppError } from "@logiscore/core";

export const INVOICING_ERROR_CODES = {
  RIF_INVALID: "INVOICE_RIF_INVALID",
  RANGE_EXHAUSTED: "INVOICE_RANGE_EXHAUSTED",
  IGTF_MISMATCH: "INVOICE_IGTF_MISMATCH",
  CENTS_ADJUSTMENT_NEEDED: "INVOICE_CENTS_ADJUSTMENT_NEEDED",
  EXCHANGE_RATE_SNAPSHOT_MISSING: "INVOICE_EXCHANGE_RATE_SNAPSHOT_MISSING",
  TENANT_ID_MUST_BE_SLUG: "INVOICING_TENANT_ID_MUST_BE_SLUG",
  ALREADY_VOIDED: "INVOICE_ALREADY_VOIDED",
  HARD_DELETE_NOT_ALLOWED: "HARD_DELETE_NOT_ALLOWED",
  CONTROL_NUMBER_INVALID: "INVOICE_CONTROL_NUMBER_INVALID",
} as const;

export type InvoicingErrorCode = keyof typeof INVOICING_ERROR_CODES;

export interface InvoicingErrorContext {
  providedValue?: unknown;
  currentNumber?: number;
  endNumber?: number;
  calculated?: number;
  stored?: number;
  total?: number;
  cents?: number;
  customerRif?: string;
}

export function createInvoicingError(
  code: InvoicingErrorCode,
  context?: InvoicingErrorContext
): AppError {
  const messages: Record<InvoicingErrorCode, string> = {
    INVOICE_RIF_INVALID: "RIF inválido. Formato requerido: V012345678, J012345678, G012345678, E012345678, P012345678 (10 caracteres)",
    INVOICE_RANGE_EXHAUSTED: "Rango de facturas agotado. Solicite un nuevo talonario.",
    INVOICE_IGTF_MISMATCH: "IGTF calculado no coincide con el registrado",
    INVOICE_CENTS_ADJUSTMENT_NEEDED: "Ajuste de céntimos necesario en el total",
    INVOICE_EXCHANGE_RATE_SNAPSHOT_MISSING: "Exchange rate snapshot es requerido para trazabilidad histórica",
    INVOICING_TENANT_ID_MUST_BE_SLUG: "En Dexie, tenant_id debe ser slug, nunca UUID",
    INVOICE_ALREADY_VOIDED: "La factura ya está anulada",
    HARD_DELETE_NOT_ALLOWED: "Soft delete obligatorio. Usar deleted_at en lugar de eliminar el registro",
    INVOICE_CONTROL_NUMBER_INVALID: "Número de control inválido",
  };

  return {
    code: INVOICING_ERROR_CODES[code],
    message: messages[code] || "Error de facturación",
    retryable: false,
    context: context as Record<string, unknown>,
  };
}

export const RIF_PATTERN = /^[VJEGP]\d{9}$/;
export const RIF_PREFIXES = ["V", "J", "G", "E", "P"] as const;

export const TAX_TYPES = ["iva", "islr", "igtf"] as const;
export const INVOICE_STATUSES = ["draft", "issued", "voided"] as const;
export const CURRENCIES = ["VES", "USD"] as const;

export const IGTF_RATE = 0.03;
export const CENTS_TOLERANCE = 0.01;
