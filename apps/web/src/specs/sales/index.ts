/**
 * Spec-Driven Development: Sales Module
 * Validadores basados en specs/sales/schema.json
 * Única Fuente de Verdad para el módulo de Ventas
 */

import { z } from "zod";
import { err, ok, type Result } from "@logiscore/core";
import type { AppError } from "@logiscore/core";
import {
  SALES_ERROR_CODES,
  createSalesError,
  PAYMENT_METHODS,
  CURRENCIES,
  SALE_STATUSES,
  IGTF_RATE,
  MAX_SUSPENDED_SALES,
  CENTS_TOLERANCE,
} from "./errors";

export {
  SALES_ERROR_CODES,
  createSalesError,
  PAYMENT_METHODS,
  CURRENCIES,
  SALE_STATUSES,
  IGTF_RATE,
  MAX_SUSPENDED_SALES,
  CENTS_TOLERANCE,
};

export interface PaymentInput {
  method: "cash" | "card" | "transfer" | "zelle" | "point";
  currency: "VES" | "USD";
  amount: number;
  reference?: string;
}

export interface SaleItemInput {
  productLocalId: string;
  presentationId?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  isWeighted?: boolean;
}

export interface ExchangeRateSnapshot {
  rate: number;
  capturedAt: string;
  source: "bcv" | "parallel" | "manual";
}

export const paymentSchema = z.object({
  method: z.enum(PAYMENT_METHODS),
  currency: z.enum(CURRENCIES),
  amount: z.number().positive(),
  reference: z.string().optional(),
});

export const saleItemSchema = z.object({
  productLocalId: z.string().uuid(),
  presentationId: z.string().uuid().optional(),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  discount: z.number().min(0).optional(),
  isWeighted: z.boolean().optional(),
});

export const exchangeRateSnapshotSchema = z.object({
  rate: z.number().positive(),
  capturedAt: z.string().datetime(),
  source: z.enum(["bcv", "parallel", "manual"]),
});

export function calculateIGTF(
  amountUSD: number,
  exchangeRate: number
): number {
  // Use 4-decimal precision for fiscal calculations; presentation rounds to 2 decimals.
  const raw = amountUSD * exchangeRate * IGTF_RATE;
  return Math.round((raw + Number.EPSILON) * 10000) / 10000;
}

export function validateIGTF(
  payments: PaymentInput[],
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
      createSalesError("IGTF_INVALID", {
        calculated,
        stored: storedIGTF,
      })
    );
  }

  return ok(undefined);
}

export function validateTenantForDexie(tenantId: string): Result<void, AppError> {
  if (!/^[a-z0-9-]+$/.test(tenantId)) {
    return err(
      createSalesError("TENANT_ID_MUST_BE_SLUG", { providedValue: tenantId })
    );
  }
  return ok(undefined);
}

export function validatePaymentSufficient(
  totalPaid: number,
  saleTotal: number
): Result<void, AppError> {
  if (totalPaid < saleTotal) {
    return err(
      createSalesError("PAYMENT_INSUFFICIENT", {
        totalPaid,
        saleTotal,
      })
    );
  }
  return ok(undefined);
}

export function validateStockAvailability(
  availableStock: number,
  requestedQuantity: number
): Result<void, AppError> {
  if (availableStock < requestedQuantity) {
    return err(
      createSalesError("STOCK_INSUFFICIENT", {
        availableStock,
        requestedQuantity,
      })
    );
  }
  return ok(undefined);
}

export function validateExchangeRateSnapshot(
  snapshot: ExchangeRateSnapshot | null | undefined
): Result<void, AppError> {
  if (!snapshot) {
    return err(createSalesError("EXCHANGE_RATE_SNAPSHOT_MISSING"));
  }

  if (!snapshot.rate || !snapshot.capturedAt || !snapshot.source) {
    return err(
      createSalesError("EXCHANGE_RATE_SNAPSHOT_MISSING", {
        providedValue: snapshot,
      })
    );
  }

  return ok(undefined);
}

export function validateQuantityPrecision(
  quantity: number,
  isWeighted: boolean
): Result<void, AppError> {
  if (isWeighted) {
    const str = quantity.toString();
    const decimals = str.split(".")[1]?.length ?? 0;
    if (decimals > 4) {
      return err(
        createSalesError("STOCK_INSUFFICIENT", {
          providedValue: quantity,
        })
      );
    }
    if (quantity < 0.0001) {
      return err(
        createSalesError("STOCK_INSUFFICIENT", {
          providedValue: quantity,
        })
      );
    }
  }
  return ok(undefined);
}

export const DECIMAL_PRECISION = {
  MONEY: 4,
  WEIGHTED: 4,
  IGTF: 4,
} as const;

export function formatMoney(value: number): string {
  return value.toFixed(2);
}

export function formatWeightedQuantity(value: number): string {
  return value.toFixed(4);
}
