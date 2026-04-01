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

