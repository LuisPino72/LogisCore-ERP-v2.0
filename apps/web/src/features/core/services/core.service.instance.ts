// Core - Instancia singleton del servicio core con todas sus dependencias
import { db, DexieCoreDbAdapter, DexieCatalogsDbAdapter } from "@/lib/db/dexie";
import { eventBus, syncEngine } from "@/lib/core/runtime";
import { supabase } from "@/lib/supabase/client";
import { createCoreService } from "./core.service";
import { createTaxRuleService } from "./tax-rule.service";

export const taxRuleService = createTaxRuleService({
  db: new DexieCoreDbAdapter(db)
});

export const coreService = createCoreService({
  db: new DexieCoreDbAdapter(db),
  syncEngine,
  supabase,
  eventBus,
  catalogsDb: new DexieCatalogsDbAdapter(db)
});
