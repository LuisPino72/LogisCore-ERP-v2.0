/**
 * Instancia singleton del servicio de inventario.
 * Configura el servicio con el adaptador de base de datos local y motores de sincronización.
 */

import { eventBus, syncEngine } from "@/lib/core/runtime";
import { DexieInventoryDbAdapter } from "./inventory.db.adapter";
import { createInventoryService } from "./inventory.service";

export const inventoryService = createInventoryService({
  db: new DexieInventoryDbAdapter(),
  syncEngine,
  eventBus
});

