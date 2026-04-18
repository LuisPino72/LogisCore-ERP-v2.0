import { Hono } from "jsr:@hono/hono@4.6.1";
import { createClient } from "jsr:@supabase/supabase-js@2.49.1";
import { createRbacMiddleware } from "../_shared/rbac-middleware";

const app = new Hono();

const jsonHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "https://logiscore-erp.vercel.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-action-context, x-user-permissions",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const cors = async (c: any, next: any) => {
  if (c.req.method === "OPTIONS") {
    return c.text("ok", 200, { "Access-Control-Allow-Origin": jsonHeaders["Access-Control-Allow-Origin"], "Access-Control-Allow-Headers": jsonHeaders["Access-Control-Allow-Headers"], "Access-Control-Allow-Methods": jsonHeaders["Access-Control-Allow-Methods"] });
  }
  await next();
};

app.use(cors);

const schema = {
  openapi: "3.0.0",
  info: {
    title: "get-product-stock-by-warehouse",
    version: "1.0.0",
    description: "Obtiene el stock de productos por almacén"
  },
  paths: {
    "/": {
      post: {
        summary: "Obtener stock",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  productLocalId: { type: "string" },
                  warehouseLocalId: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Stock exitoso",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    stock: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          product_local_id: { type: "string" },
                          warehouse_local_id: { type: "string" },
                          quantity: { type: "number" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
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

app.post("/", async (c) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const rbacMiddleware = await createRbacMiddleware("INVENTORY:VIEW");
    const rbacResult = await rbacMiddleware(c.req.raw);

    if (!rbacResult.ok) {
      return c.json({ error: rbacResult.error.code }, 403);
    }

    const { tenantId } = rbacResult.data;
    const input: StockInput = await c.req.json();
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
      return c.json({ error: "DB_ERROR", details: error.message }, 500);
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

    return c.json({ success: true, stock: result });
  } catch (error) {
    return c.json({ error: "INTERNAL_ERROR", message: String(error) }, 500);
  }
});

app.doc("/openapi.json", schema);

export default app;