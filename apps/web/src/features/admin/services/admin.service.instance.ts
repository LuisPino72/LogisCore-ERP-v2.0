/**
 * Instancia singleton del servicio de admin.
 * Provee acceso global al servicio de admin con dependencias inyectadas.
 */

import { supabase } from "@/lib/supabase/client";
import { eventBus } from "@/lib/core/runtime";
import { createAdminService } from "./admin.service";

export const adminService = createAdminService({
  supabase,
  eventBus
});
