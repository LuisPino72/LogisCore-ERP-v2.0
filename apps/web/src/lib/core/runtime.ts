import { DefaultSyncEngine, InMemoryEventBus, ok } from "@logiscore/core";
import { db, DexieSyncStorageAdapter } from "@/lib/db/dexie";

export const eventBus = new InMemoryEventBus();

export const syncEngine = new DefaultSyncEngine({
  storage: new DexieSyncStorageAdapter(db),
  eventBus,
  processor: {
    async process() {
      return ok<void>(undefined);
    }
  }
});
