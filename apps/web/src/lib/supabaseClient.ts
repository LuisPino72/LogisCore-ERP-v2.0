import { createClient } from "@supabase/supabase-js";

const options = {
  auth: {
    autoRefreshToken: !import.meta.env.DEV // Desactivar en desarrollo
  }
};

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  options
);
