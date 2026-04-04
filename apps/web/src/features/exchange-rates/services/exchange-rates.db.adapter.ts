import { db, type ExchangeRateRecord } from "@/lib/db/dexie";
import type { ExchangeRatesDb } from "./exchange-rates.service";

export class DexieExchangeRatesDbAdapter implements ExchangeRatesDb {
  async listExchangeRates(tenantId: string): Promise<ExchangeRateRecord[]> {
    return db.exchange_rates
      .where("tenantId")
      .equals(tenantId)
      .and((item) => !item.deletedAt)
      .sortBy("createdAt");
  }

  async getActiveRate(
    tenantId: string,
    fromCurrency: string,
    toCurrency: string
  ): Promise<ExchangeRateRecord | undefined> {
    // Buscar primero por tenantId del usuario
    const rates = await db.exchange_rates
      .where("tenantId")
      .equals(tenantId)
      .and(
        (item) =>
          !item.deletedAt &&
          item.fromCurrency === fromCurrency &&
          item.toCurrency === toCurrency
      )
      .toArray();

    // Si hay rates para el tenant, usarla
    if (rates.length > 0) {
      const now = new Date();
      const valid = rates.find(
        (r) => !r.validTo || new Date(r.validTo) >= now
      );
      if (valid) return valid;
    }

    // Si no hay rate para el tenant, buscar tasa oficial (source: "oficial")
    const oficialRates = await db.exchange_rates
      .where("source")
      .equals("oficial")
      .and(
        (item) =>
          !item.deletedAt &&
          item.fromCurrency === fromCurrency &&
          item.toCurrency === toCurrency
      )
      .toArray();

    if (oficialRates.length > 0) {
      const now = new Date();
      const valid = oficialRates.find(
        (r) => !r.validTo || new Date(r.validTo) >= now
      );
      return valid ?? oficialRates[0];
    }

    return undefined;
  }

  async createExchangeRate(rate: ExchangeRateRecord): Promise<void> {
    await db.exchange_rates.put(rate);
  }
}

export const exchangeRatesDb = new DexieExchangeRatesDbAdapter();
