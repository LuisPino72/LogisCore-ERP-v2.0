/**
 * Instancia singleton del servicio de ventas.
 * Provee acceso global al servicio de ventas con dependencias inyectadas.
 */

import { eventBus, syncEngine } from "@/lib/core/runtime";
import { supabase } from "@/lib/supabase/client";
import { DexieSalesDbAdapter } from "./sales.db.adapter";
import { createSalesService } from "./sales.service";

export const salesService = createSalesService({
  db: new DexieSalesDbAdapter(),
  syncEngine,
  eventBus,
  supabase
});

