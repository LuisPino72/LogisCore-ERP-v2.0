import { supabase } from "@/lib/supabase/client";
import { eventBus } from "@/lib/core/runtime";
import { createAuthService } from "./auth.service";

export const authService = createAuthService({
  supabase,
  eventBus
});
