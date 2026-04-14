import type { AppError } from "@logiscore/core";

export const SALES_ERROR_CODES = {
  IGTF_INVALID: "SALE_IGTF_INVALID",
  CENTS_ADJUSTMENT_NEEDED: "SALE_CENTS_ADJUSTMENT_NEEDED",
  TENANT_ID_MUST_BE_SLUG: "SALES_TENANT_ID_MUST_BE_SLUG",
  STOCK_INSUFFICIENT: "SALE_STOCK_INSUFFICIENT",
  PAYMENT_INSUFFICIENT: "SALE_PAYMENT_INSUFFICIENT",
  CHANGE_EXCEEDS_CASH: "SALE_CHANGE_EXCEEDS_CASH",
  EXCHANGE_RATE_SNAPSHOT_MISSING: "SALE_EXCHANGE_RATE_SNAPSHOT_MISSING",
  MAX_SUSPENDED_EXCEEDED: "SALE_MAX_SUSPENDED_EXCEEDED",
} as const;

export type SalesErrorCode = keyof typeof SALES_ERROR_CODES;

export interface SalesErrorContext {
  calculated?: number;
  stored?: number;
  total?: number;
  cents?: number;
  providedValue?: unknown;
  productId?: string;
  warehouseId?: string;
  availableStock?: number;
  requestedQuantity?: number;
  totalPaid?: number;
  saleTotal?: number;
}

export function createSalesError(
  code: SalesErrorCode,
  context?: SalesErrorContext
): AppError {
  const messages: Record<SalesErrorCode, string> = {
    SALE_IGTF_INVALID: "IGTF calculado no coincide con el registrado",
    SALE_CENTS_ADJUSTMENT_NEEDED: "Ajuste de céntimos necesario para cerrar la venta",
    SALES_TENANT_ID_MUST_BE_SLUG: "En Dexie, tenant_id debe ser slug, nunca UUID",
    SALE_STOCK_INSUFFICIENT: "Stock insuficiente para completar la venta",
    SALE_PAYMENT_INSUFFICIENT: "Monto pagado es menor al total de la venta",
    SALE_CHANGE_EXCEEDS_CASH: "No hay suficiente efectivo en caja para dar cambio",
    SALE_EXCHANGE_RATE_SNAPSHOT_MISSING: "Exchange rate snapshot es requerido para trazabilidad histórica",
    SALE_MAX_SUSPENDED_EXCEEDED: "Máximo 10 ventas suspendidas por terminal",
  };

  return {
    code: SALES_ERROR_CODES[code],
    message: messages[code] || "Error de venta",
    retryable: false,
    context: context as Record<string, unknown>,
  };
}

export const PAYMENT_METHODS = ["cash", "card", "transfer", "zelle", "point"] as const;
export const CURRENCIES = ["VES", "USD"] as const;
export const SALE_STATUSES = ["draft", "completed", "voided", "refunded"] as const;

export const IGTF_RATE = 0.03;
export const MAX_SUSPENDED_SALES = 10;
export const CENTS_TOLERANCE = 0.01;
