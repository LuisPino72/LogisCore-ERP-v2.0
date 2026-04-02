/**
 * Instancia singleton del servicio de reportes.
 * Provee acceso global al servicio de reportes con dependencias inyectadas.
 */

import { eventBus } from "@/lib/core/runtime";
import { DexieReportsDbAdapter } from "./reports.db.adapter";
import { createReportsService } from "./reports.service";

export const reportsService = createReportsService({
  db: new DexieReportsDbAdapter(),
  eventBus
});