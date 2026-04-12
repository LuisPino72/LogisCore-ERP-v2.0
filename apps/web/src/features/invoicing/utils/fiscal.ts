import { createAppError, err, ok, type Result } from "@logiscore/core";
import type { AppError } from "@logiscore/core";

export const RIF_PATTERN = /^[VJEGP]\d{9}$/;

export const validateRif = (rif: string): Result<boolean, AppError> => {
  if (!rif || rif.trim() === "") {
    return err(
      createAppError({
        code: "INVOICE_RIF_INVALID",
        message: "El RIF del cliente es obligatorio para emitir factura.",
        retryable: false
      })
    );
  }

  const normalizedRif = rif.trim().toUpperCase();
  
  if (!RIF_PATTERN.test(normalizedRif)) {
    return err(
      createAppError({
        code: "INVOICE_RIF_INVALID",
        message: `RIF inválido. Formato requerido: V012345678, J012345678, G012345678, E012345678 o P012345678 (10 caracteres).`,
        retryable: false,
        context: { providedRif: rif }
      })
    );
  }

  return ok(true);
};

export const roundMoney = (value: number): number => {
  return Math.round((value + Number.EPSILON) * 100) / 100;
};

export const roundMoney4Decimals = (value: number): number => {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
};

export const applyCentsRule = (total: number): number => {
  const rounded = roundMoney(total);
  const diff = Math.abs(total - rounded);
  if (diff <= 0.01) {
    return rounded;
  }
  return total;
};

export const computeIgtf = (
  subtotal: number,
  taxTotal: number,
  igtfRate: number
): number => {
  const totalBeforeIgtf = subtotal + taxTotal;
  const igtfAmount = roundMoney(totalBeforeIgtf * (igtfRate / 100));
  return igtfAmount;
};

export const computeInvoiceTotal = (
  subtotal: number,
  taxTotal: number,
  igtfAmount: number
): number => {
  const totalBeforeCents = subtotal + taxTotal + igtfAmount;
  return applyCentsRule(totalBeforeCents);
};

export interface ExchangeRateSnapshot {
  rate: number;
  capturedAt: string;
  source: string;
}

export const createExchangeRateSnapshot = (
  rate: number,
  source: string = "BCV"
): ExchangeRateSnapshot => ({
  rate: roundMoney4Decimals(rate),
  capturedAt: new Date().toISOString(),
  source
});

export type TaxAliquota = "general" | "reducida" | "adicional";

export const getAliquotaLabel = (aliquota: TaxAliquota): string => {
  switch (aliquota) {
    case "general":
      return "16%";
    case "reducida":
      return "8%";
    case "adicional":
      return "31%";
  }
};