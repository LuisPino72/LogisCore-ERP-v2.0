import { salesService } from "@/features/sales/services/sales.service.instance";
import { inventoryService } from "@/features/inventory/services/inventory.service.instance";
import { productsService } from "@/features/products/services/products.service.instance";
import { eventBus } from "@/lib/core/runtime";
import { createDashboardService } from "./dashboard.service";

export const dashboardService = createDashboardService({
  sales: salesService,
  inventory: inventoryService,
  products: productsService,
  eventBus
});
