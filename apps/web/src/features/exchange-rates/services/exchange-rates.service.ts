import { createAppError, err, ok, type AppError, type Result } from "@logiscore/core";
import type { ExchangeRateRecord } from "@/lib/db/dexie";

export interface ExchangeRatesService {
  getActiveRate(
    tenantId: string,
    fromCurrency: string,
    toCurrency: string
  ): Promise<Result<ExchangeRateRecord | null, AppError>>;
  calculatePriceInBs(priceUsd: number, rate: number): number;
  fetchAndSaveRates(): Promise<Result<{ fetched: number }, AppError>>;
}

export interface ExchangeRatesDb {
  listExchangeRates(tenantId: string): Promise<ExchangeRateRecord[]>;
  getActiveRate(
    tenantId: string,
    fromCurrency: string,
    toCurrency: string
  ): Promise<ExchangeRateRecord | undefined>;
  createExchangeRate(rate: ExchangeRateRecord): Promise<void>;
}

interface CreateExchangeRatesServiceDeps {
  db: ExchangeRatesDb;
}

export const createExchangeRatesService = ({
  db
}: CreateExchangeRatesServiceDeps): ExchangeRatesService => {
  const roundMoney = (value: number): number =>
    Math.round((value + Number.EPSILON) * 100) / 100;

  const getActiveRate: ExchangeRatesService["getActiveRate"] = async (
    tenantId,
    fromCurrency,
    toCurrency
  ) => {
    try {
      const rate = await db.getActiveRate(tenantId, fromCurrency, toCurrency);
      return ok(rate ?? null);
    } catch (error) {
      return err(
        createAppError({
          code: "EXCHANGE_RATE_GET_FAILED",
          message: `Error al obtener tasa de cambio: ${error}`,
          retryable: true
        })
      );
    }
  };

  const calculatePriceInBs: ExchangeRatesService["calculatePriceInBs"] = (
    priceUsd,
    rate
  ) => {
    return roundMoney(priceUsd * rate);
  };

  const fetchAndSaveRates: ExchangeRatesService["fetchAndSaveRates"] = async () => {
    try {
      const response = await fetch("https://ve.dolarapi.com/v1/dolares");
      if (!response.ok) {
        return err(
          createAppError({
            code: "EXCHANGE_RATE_API_ERROR",
            message: `Error de API: ${response.status}`,
            retryable: true
          })
        );
      }

      const dolares = await response.json();
      let fetched = 0;

      for (const d of dolares) {
        const rate = d.venta || d.compra;
        if (rate <= 0) continue;

        const now = new Date().toISOString();
        const localId = crypto.randomUUID();

        await db.createExchangeRate({
          localId,
          tenantId: "system",
          fromCurrency: "USD",
          toCurrency: "VES",
          rate: roundMoney(rate),
          source: d.fuente,
          validFrom: now,
          validTo: "",
          createdAt: now,
          updatedAt: now,
          deletedAt: ""
        });
        fetched++;
      }

      return ok({ fetched });
    } catch (error) {
      return err(
        createAppError({
          code: "EXCHANGE_RATE_FETCH_FAILED",
          message: `Error al obtener tasas: ${error}`,
          retryable: true
        })
      );
    }
  };

  return {
    getActiveRate,
    calculatePriceInBs,
    fetchAndSaveRates
  };
};
