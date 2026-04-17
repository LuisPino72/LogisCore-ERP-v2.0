import { createClient } from "jsr:@supabase/supabase-js@2.49.1";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createRbacMiddleware } from "../_shared/rbac-middleware";

const jsonHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-action-context, x-user-permissions",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

interface StockInput {
  productLocalId?: string;
  warehouseLocalId?: string;
}

interface StockResult {
  success: boolean;
  stock: Array<{
    product_local_id: string;
    warehouse_local_id: string;
    quantity: number;
  }>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: jsonHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "METHOD_NOT_ALLOWED" }),
      { status: 405, headers: jsonHeaders }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const rbacMiddleware = await createRbacMiddleware("INVENTORY:VIEW");
    const rbacResult = await rbacMiddleware(req);
    
    if (!rbacResult.ok) {
      return new Response(
        JSON.stringify({ error: rbacResult.error.code }),
        { status: 403, headers: jsonHeaders }
      );
    }

    const { tenantId } = rbacResult.data;
    const input: StockInput = await req.json();
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let query = supabase
      .from("stock_movements")
      .select("product_local_id, warehouse_local_id, quantity, movement_type")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null);

    if (input.productLocalId) {
      query = query.eq("product_local_id", input.productLocalId);
    }
    if (input.warehouseLocalId) {
      query = query.eq("warehouse_local_id", input.warehouseLocalId);
    }

    const { data: movements, error } = await query;

    if (error) {
      return new Response(
        JSON.stringify({ error: "DB_ERROR", details: error.message }),
        { status: 500, headers: jsonHeaders }
      );
    }

    const stockMap = new Map<string, number>();

    for (const m of movements || []) {
      const key = `${m.product_local_id}:${m.warehouse_local_id}`;
      const incoming = ["purchase_in", "adjustment_in", "production_in", "transfer_in", "count_adjustment"].includes(m.movement_type);
      const qty = incoming ? m.quantity : -m.quantity;
      stockMap.set(key, (stockMap.get(key) || 0) + qty);
    }

    const result: StockResult["stock"] = [];
    for (const [key, qty] of stockMap.entries()) {
      const [product_local_id, warehouse_local_id] = key.split(":");
      result.push({ product_local_id, warehouse_local_id, quantity: Math.max(0, qty) });
    }

    return new Response(
      JSON.stringify({ success: true, stock: result } as StockResult),
      { headers: jsonHeaders }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "INTERNAL_ERROR", message: String(error) }),
      { status: 500, headers: jsonHeaders }
    );
  }
});
