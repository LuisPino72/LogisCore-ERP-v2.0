// Auth - Instancia singleton del servicio de autenticación
import { supabase } from "@/lib/supabase/client";
import { eventBus } from "@/lib/core/runtime";
import { createAuthService, type AuthSupabaseLike } from "./auth.service";

const supabaseClient: AuthSupabaseLike = supabase as AuthSupabaseLike;

export const authService = createAuthService({
  supabase: supabaseClient,
  eventBus
});
