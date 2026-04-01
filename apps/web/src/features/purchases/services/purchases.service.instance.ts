import { eventBus } from "@/lib/core/runtime";
import { createPurchasesService } from "./purchases.service";

export const purchasesService = createPurchasesService({
  eventBus
});
