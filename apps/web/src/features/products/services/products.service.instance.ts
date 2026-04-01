import { eventBus, syncEngine } from "@/lib/core/runtime";
import { supabase } from "@/lib/supabase/client";
import { DexieProductsDbAdapter } from "./products.db.adapter";
import { createProductsService } from "./products.service";

export const productsService = createProductsService({
  db: new DexieProductsDbAdapter(),
  syncEngine,
  eventBus,
  supabase
});
