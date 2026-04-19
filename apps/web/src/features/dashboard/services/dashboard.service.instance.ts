import { salesService } from "@/features/sales/services/sales.service.instance";
import { inventoryService } from "@/features/inventory/services/inventory.service.instance";
import { productsService } from "@/features/products/services/products.service.instance";
import { exchangeRatesService } from "@/features/exchange-rates/services/exchange-rates.service.instance";
import { eventBus } from "@/lib/core/runtime";
import { createDashboardService } from "./dashboard.service";

export const dashboardService = createDashboardService({
  sales: salesService,
  inventory: inventoryService,
  products: productsService,
  exchangeRates: {
    getActiveRate: async (tenantId: string, fromCurrency: string, toCurrency: string) => {
      const result = await exchangeRatesService.getActiveRate(tenantId, fromCurrency, toCurrency);
      if (!result.ok || !result.data) {
        return { ok: true, data: null };
      }
      return { ok: true, data: { rate: result.data.rate } };
    }
  },
  eventBus
});
