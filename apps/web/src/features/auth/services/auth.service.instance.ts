// Auth - Instancia singleton del servicio de autenticación
import { supabase } from "@/lib/supabase/client";
import { eventBus } from "@/lib/core/runtime";
import { createAuthService, type AuthSupabaseLike } from "./auth.service";

// El cliente de Supabase tiene tanto auth como from
const supabaseClient = supabase as AuthSupabaseLike;

export const authService = createAuthService({
  supabase: supabaseClient,
  eventBus
});
