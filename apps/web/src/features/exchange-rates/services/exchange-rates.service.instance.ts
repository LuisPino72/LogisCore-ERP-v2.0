import { createExchangeRatesService } from "./exchange-rates.service";
import { exchangeRatesDb } from "./exchange-rates.db.adapter";

export const exchangeRatesService = createExchangeRatesService({
  db: exchangeRatesDb
});
