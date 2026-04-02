// Purchases - Instancia singleton del servicio de compras
import { eventBus, syncEngine } from "@/lib/core/runtime";
import { DexiePurchasesDbAdapter } from "./purchases.db.adapter";
import { createPurchasesService } from "./purchases.service";

export const purchasesService = createPurchasesService({
  eventBus,
  db: new DexiePurchasesDbAdapter(),
  syncEngine
});
