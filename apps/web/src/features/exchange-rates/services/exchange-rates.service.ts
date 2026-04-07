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
  setManualRate(
    tenantId: string,
    rate: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<Result<void, AppError>>;
  clearManualRates(): Promise<Result<void, AppError>>;
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

      // Filtrar solo tasa oficial
      const oficial = dolares.find((d: { fuente: string }) => d.fuente === "oficial");
      
      if (!oficial) {
        return ok({ fetched: 0 });
      }

      const rate = oficial.venta || oficial.compra || oficial.promedio;
      if (!rate || rate <= 0) {
        return ok({ fetched: 0 });
      }

      // BORRAR tasas anteriores en Dexie antes de guardar nueva
      const existingRates = await db.listExchangeRates("system");
      for (const existing of existingRates) {
        if (!existing.deletedAt) {
          await db.createExchangeRate({
            ...existing,
            deletedAt: new Date().toISOString()
          });
        }
      }

      const now = new Date().toISOString();
      const localId = crypto.randomUUID();

      await db.createExchangeRate({
        localId,
        tenantId: "system",
        fromCurrency: "USD",
        toCurrency: "VES",
        rate: roundMoney(rate),
        source: "oficial",
        validFrom: now,
        validTo: "",
        createdAt: now,
        updatedAt: now,
        deletedAt: ""
      });
      fetched = 1;

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

  const setManualRate: ExchangeRatesService["setManualRate"] = async (
    tenantId,
    rate,
    fromCurrency = "USD",
    toCurrency = "VES"
  ) => {
    try {
      const now = new Date().toISOString();
      const localId = crypto.randomUUID();

      await db.createExchangeRate({
        localId,
        tenantId,
        fromCurrency,
        toCurrency,
        rate: roundMoney(rate),
        source: "manual",
        validFrom: now,
        validTo: "",
        createdAt: now,
        updatedAt: now,
        deletedAt: ""
      });

      return ok(undefined);
    } catch (error) {
      return err(
        createAppError({
          code: "EXCHANGE_RATE_SET_MANUAL_FAILED",
          message: `Error al guardar tasa manual: ${error}`,
          retryable: false
        })
      );
    }
  };

  const clearManualRates: ExchangeRatesService["clearManualRates"] = async () => {
    try {
      const allRates = await db.listExchangeRates("system");
      const manualRates = allRates.filter(r => r.source === "manual" && !r.deletedAt);
      
      for (const rate of manualRates) {
        await db.createExchangeRate({
          ...rate,
          deletedAt: new Date().toISOString()
        });
      }

      return ok(undefined);
    } catch (error) {
      return err(
        createAppError({
          code: "EXCHANGE_RATE_CLEAR_MANUAL_FAILED",
          message: `Error al limpiar tasas manuales: ${error}`,
          retryable: false
        })
      );
    }
  };

  return {
    getActiveRate,
    calculatePriceInBs,
    fetchAndSaveRates,
    setManualRate,
    clearManualRates
  };
};
