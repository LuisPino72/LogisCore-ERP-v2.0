import { DefaultSyncEngine, InMemoryEventBus } from "@logiscore/core";
import { db, DexieSyncStorageAdapter } from "@/lib/db/dexie";
import { createEdgeFunctionSyncProcessor } from "@/lib/sync/edge-function-processor";

export const eventBus = new InMemoryEventBus();

export const syncEngine = new DefaultSyncEngine({
  storage: new DexieSyncStorageAdapter(db),
  eventBus,
  processor: createEdgeFunctionSyncProcessor(),
  baseDelayMs: 500
});
