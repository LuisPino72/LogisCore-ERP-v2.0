import { supabase } from "@/lib/supabase/client";
import { eventBus } from "@/lib/core/runtime";
import { createTenantService } from "./tenant.service";

export const tenantService = createTenantService({
  supabase,
  eventBus
});
