import { Hono } from "jsr:@hono/hono@4.6.1";
import { createClient } from "jsr:@supabase/supabase-js@2.49.1";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const app = new Hono();

const cors = async (c: any, next: any) => {
  if (c.req.method === "OPTIONS") {
    return c.text("ok", 200, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS"
    });
  }
  await next();
};
app.use(cors);

const allowedTables = [
  "suppliers", "categories", "products", "product_presentations", "product_size_colors",
  "warehouses", "stock_movements", "inventory_counts", "sales", "suspended_sales",
  "box_closings", "purchases", "receivings", "inventory_lots", "recipes",
  "production_orders", "production_logs", "invoices", "tax_rules", "exchange_rates"
];

const openapi = {
  openapi: "3.0.0",
  info: { title: "get-incremental-updates", version: "1.0.0", description: "Obtiene actualizaciones incrementales" },
  paths: {
    "/": {
      post: {
        summary: "Obtener updates incrementales",
        requestBody: {
          content: { "application/json": {
            schema: {
              type: "object",
              required: ["table", "since"],
              properties: {
                table: { type: "string", enum: allowedTables },
                since: { type: "number" },
                limit: { type: "number", default: 100 },
                cursor: { type: "string" }
              }
            }
          }}
        },
        responses: {
          "200": { description: "OK" },
          "400": { description: "Error" },
          "401": { description: "Unauthorized" }
        }
      }
    }
  }
};

const decodeJwtPayload = (token: string) => {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - base64.length % 4) % 4);
    return JSON.parse(atob(padded));
  } catch { return null; }
};

app.post("/", async (c) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = c.req.raw.headers.get("Authorization");

  if (!authHeader) {
    return c.json({ success: false, error: "MISSING_AUTH_HEADER" }, 401);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const payload = decodeJwtPayload(authHeader.replace("Bearer ", ""));
  if (!payload?.sub) {
    return c.json({ success: false, error: "INVALID_TOKEN" }, 401);
  }

  const tenantId = payload.app_metadata?.tenant_id;
  const tenantSlug = payload.tenant_slug;
  if (!tenantId && !tenantSlug) {
    return c.json({ success: false, error: "MISSING_TENANT_INFO" }, 400);
  }

  let body: any;
  try { body = await c.req.json(); } catch {
    return c.json({ success: false, error: "INVALID_JSON" }, 400);
  }

  const table = body.table;
  const since = body.since;
  const limit = body.limit || 100;
  const cursor = body.cursor;

  if (!table || !since || !allowedTables.includes(table)) {
    return c.json({ success: false, error: "INVALID_INPUT" }, 400);
  }

  const sinceDate = new Date(since).toISOString();
  let query = supabase.from(table).select("*").is("deleted_at", null).gte("updated_at", sinceDate).order("updated_at", { ascending: true }).limit(limit + 1);

  if (tenantId) query = query.eq("tenant_id", tenantId);
  else if (tenantSlug) query = query.eq("tenant_slug", tenantSlug);

  if (cursor) {
    try {
      const decodedCursor = atob(cursor);
      query = query.gt("updated_at", decodedCursor);
    } catch {}
  }

  const { data, error } = await query;
  if (error) {
    return c.json({ success: false, error: "QUERY_FAILED", details: error.message }, 500);
  }

  const hasMore = data ? data.length > limit : false;
  const results = hasMore ? data.slice(0, limit) : data;
  let nextCursor: string | null = null;

  if (hasMore && results.length > 0) {
    const lastItem = results[results.length - 1];
    if (lastItem.updated_at) nextCursor = btoa(lastItem.updated_at);
  }

  return c.json({
    success: true,
    data: results,
    nextCursor,
    hasMore,
    syncedAt: new Date().toISOString()
  });
});

app.doc("/openapi.json", openapi);
export default app;