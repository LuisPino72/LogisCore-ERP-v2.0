// Products - Instancia singleton del servicio de productos
import { eventBus, syncEngine } from "@/lib/core/runtime";
import { supabase as supabaseClient } from "@/lib/supabase/client";
import type { ProductsSupabaseLike } from "./products.service";
import { DexieProductsDbAdapter } from "./products.db.adapter";
import { createProductsService } from "./products.service";

const supabase: ProductsSupabaseLike | null = supabaseClient
  ? {
      rpc: (fn, args) =>
        supabaseClient!.rpc(fn, args).then((response) => ({
          data: response.data,
          error: response.error ? { message: response.error.message } : null
        }))
    }
  : null;

export const productsService = createProductsService({
  db: new DexieProductsDbAdapter(),
  syncEngine,
  eventBus,
  supabase
});
