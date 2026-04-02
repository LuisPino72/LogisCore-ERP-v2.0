/**
 * Instancia singleton del servicio de tenants.
 * Provee acceso global al servicio de tenants con dependencias inyectadas.
 */

import { supabase } from "@/lib/supabase/client";
import { eventBus } from "@/lib/core/runtime";
import { createTenantService } from "./tenant.service";

export const tenantService = createTenantService({
  supabase,
  eventBus
});
