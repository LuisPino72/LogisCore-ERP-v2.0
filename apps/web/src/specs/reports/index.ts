/**
 * Spec-Driven Development: Reports Module
 * Validadores basados en specs/reports/schema.json
 * Única Fuente de Verdad para Reportes Financieros
 */

import { z } from "zod";
import { ok, err, type Result, type AppError } from "@logiscore/core";
import { ReportErrors } from "./errors";

export { ReportErrors };
export type { ReportErrorCode } from "./errors";

export const BalanceSheetSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().min(1),
  reportDate: z.string(),
  currency: z.enum(["VES", "USD"]),
  exchangeRate: z.number().min(0).optional(),
  assets: z.object({
    current: z.number(),
    nonCurrent: z.number(),
    total: z.number(),
  }),
  liabilities: z.object({
    current: z.number(),
    nonCurrent: z.number(),
    total: z.number(),
  }),
  equity: z.object({
    capital: z.number(),
    reserves: z.number(),
    retainedEarnings: z.number(),
    total: z.number(),
  }),
  isBalanced: z.boolean(),
  difference: z.number().optional(),
  createdAt: z.string().datetime().optional(),
});

export const IncomeStatementSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
  currency: z.enum(["VES", "USD"]),
  revenue: z.number(),
  costOfGoodsSold: z.number(),
  grossProfit: z.number(),
  operatingExpenses: z.number(),
  operatingIncome: z.number(),
  otherIncome: z.number().optional(),
  otherExpenses: z.number().optional(),
  netProfit: z.number(),
  createdAt: z.string().datetime().optional(),
});

export const CashFlowSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
  currency: z.enum(["VES", "USD"]),
  operatingActivities: z.number(),
  investingActivities: z.number().optional(),
  financingActivities: z.number().optional(),
  netCashFlow: z.number(),
  igtfApplied: z.number().optional(),
  createdAt: z.string().datetime().optional(),
});

export type BalanceSheet = z.infer<typeof BalanceSheetSchema>;
export type IncomeStatement = z.infer<typeof IncomeStatementSchema>;
export type CashFlow = z.infer<typeof CashFlowSchema>;

export function validateBalanceSheet(data: unknown): Result<BalanceSheet, AppError> {
  const result = BalanceSheetSchema.safeParse(data);
  if (!result.success) {
    return err({
      code: "REPORT_VALIDATION_FAILED",
      message: result.error.errors.map((e) => e.message).join(", "),
      retryable: false,
    });
  }
  return ok(result.data);
}

export function validateIncomeStatement(data: unknown): Result<IncomeStatement, AppError> {
  const result = IncomeStatementSchema.safeParse(data);
  if (!result.success) {
    return err({
      code: "REPORT_VALIDATION_FAILED",
      message: result.error.errors.map((e) => e.message).join(", "),
      retryable: false,
    });
  }
  return ok(result.data);
}

export function validateCashFlow(data: unknown): Result<CashFlow, AppError> {
  const result = CashFlowSchema.safeParse(data);
  if (!result.success) {
    return err({
      code: "REPORT_VALIDATION_FAILED",
      message: result.error.errors.map((e) => e.message).join(", "),
      retryable: false,
    });
  }
  return ok(result.data);
}

export function checkBalanceSheetIntegrity(
  assetsTotal: number,
  liabilitiesTotal: number,
  equityTotal: number,
  tolerance: number = 0.0001
): Result<boolean, AppError> {
  const difference = Math.abs(assetsTotal - (liabilitiesTotal + equityTotal));
  
  if (difference > tolerance) {
    return err({
      code: ReportErrors.BALANCE_SHEET_IMBALANCED.code,
      message: `${ReportErrors.BALANCE_SHEET_IMBALANCED.message} Diferencia: ${difference.toFixed(4)}`,
      retryable: false,
      context: { assets: assetsTotal, liabilities: liabilitiesTotal, equity: equityTotal, difference },
    });
  }
  
  return ok(true);
}

export function validateGrossProfit(
  revenue: number,
  costOfGoodsSold: number,
  grossProfit: number,
  tolerance: number = 0.0001
): Result<boolean, AppError> {
  const expected = revenue - costOfGoodsSold;
  const difference = Math.abs(grossProfit - expected);
  
  if (difference > tolerance) {
    return err({
      code: ReportErrors.GROSS_PROFIT_MISMATCH.code,
      message: ReportErrors.GROSS_PROFIT_MISMATCH.message,
      retryable: false,
    });
  }
  
  return ok(true);
}

export function validateNetProfit(
  grossProfit: number,
  operatingExpenses: number,
  otherIncome: number,
  otherExpenses: number,
  netProfit: number,
  tolerance: number = 0.0001
): Result<boolean, AppError> {
  const expected = grossProfit - operatingExpenses - otherExpenses + otherIncome;
  const difference = Math.abs(netProfit - expected);
  
  if (difference > tolerance) {
    return err({
      code: ReportErrors.NET_PROFIT_MISMATCH.code,
      message: ReportErrors.NET_PROFIT_MISMATCH.message,
      retryable: false,
    });
  }
  
  return ok(true);
}