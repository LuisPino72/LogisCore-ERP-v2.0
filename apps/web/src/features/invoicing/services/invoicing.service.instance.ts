import { eventBus, syncEngine } from "@/lib/core/runtime";
import { DexieInvoicingDbAdapter } from "./invoicing.db.adapter";
import { createInvoicingService } from "./invoicing.service";

export const invoicingService = createInvoicingService({
  db: new DexieInvoicingDbAdapter(),
  syncEngine,
  eventBus
});