// Production - Instancia singleton del servicio de producción  
import { eventBus, syncEngine } from "@/lib/core/runtime";
import { DexieProductionDbAdapter } from "./production.db.adapter";
import { createProductionService } from "./production.service";

export const productionService = createProductionService({
  db: new DexieProductionDbAdapter(),
  syncEngine,
  eventBus
});
