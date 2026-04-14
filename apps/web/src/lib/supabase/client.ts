import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isTest = import.meta.env.MODE === "test" || import.meta.env.VITE_SUPABASE_URL === "test";

if (!supabaseUrl || !supabaseAnonKey) {
  if (!isTest) {
    throw new Error(
      "Faltan variables VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY. Configure .env.local."
    );
  }
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
