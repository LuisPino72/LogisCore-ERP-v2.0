import { DefaultSyncEngine, InMemoryEventBus } from "@logiscore/core";
import { db, DexieSyncStorageAdapter } from "@/lib/db/dexie";
import { createEdgeFunctionSyncProcessor } from "@/lib/sync/edge-function-processor";
import { tenantTranslator, type TenantDbClient } from "@/lib/sync/tenant-translator";
import { supabase } from "@/lib/supabase/client";
import { DexieExchangeRatesDbAdapter } from "@/features/exchange-rates/services/exchange-rates.db.adapter";
import { createExchangeRatesService } from "@/features/exchange-rates/services/exchange-rates.service";

if (supabase) {
  tenantTranslator.setDbClient(supabase as unknown as TenantDbClient);
}

export const eventBus = new InMemoryEventBus();

export const syncEngine = new DefaultSyncEngine({
  storage: new DexieSyncStorageAdapter(db),
  eventBus,
  processor: createEdgeFunctionSyncProcessor(),
  baseDelayMs: 500
});

const exchangeRatesDbAdapter = new DexieExchangeRatesDbAdapter(db);
export const exchangeRateService = createExchangeRatesService({ db: exchangeRatesDbAdapter });
