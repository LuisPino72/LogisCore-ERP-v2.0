/**
 * Instancia singleton del servicio de facturación.
 * Configura el servicio con el adaptador de base de datos local y motores de sincronización.
 */

import { eventBus, syncEngine, exchangeRateService } from "@/lib/core/runtime";
import { DexieInvoicingDbAdapter } from "./invoicing.db.adapter";
import { invoiceRangeService } from "./invoice-range.service.instance";
import { createInvoicingService } from "./invoicing.service";
import { taxRuleService } from "@/features/core/services/core.service.instance";

export const invoicingService = createInvoicingService({
  db: new DexieInvoicingDbAdapter(),
  syncEngine,
  eventBus,
  invoiceRangeService,
  getExchangeRate: async () => {
    const rate = await exchangeRateService.getCurrentRate("USD", "VES");
    return rate?.rate ?? 1;
  },
  taxRuleService,
});