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
    // Buscar la tasa más reciente (no eliminada)
    const rates = await db.exchange_rates
      .toArray()
      .then((rates) =>
        rates
          .filter(
            (item) =>
              !item.deletedAt &&
              item.fromCurrency === fromCurrency &&
              item.toCurrency === toCurrency
          )
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      );

    return rates[0];
  }

  async createExchangeRate(rate: ExchangeRateRecord): Promise<void> {
    await db.exchange_rates.put(rate);
  }
}

export const exchangeRatesDb = new DexieExchangeRatesDbAdapter();
