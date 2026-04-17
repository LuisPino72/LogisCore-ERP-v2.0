import { createClient } from "jsr:@supabase/supabase-js@2.49.1";
import { z } from "npm:zod@3.23.8";

const TableSchema = z.enum([
  "suppliers",
  "categories",
  "products",
  "product_presentations",
  "product_size_colors",
  "warehouses",
  "stock_movements",
  "inventory_counts",
  "sales",
  "suspended_sales",
  "box_closings",
  "purchases",
  "receivings",
  "inventory_lots",
  "recipes",
  "production_orders",
  "production_logs",
  "invoices",
  "tax_rules",
  "exchange_rates"
]);

const InputSchema = z.object({
  table: TableSchema,
  since: z.number().int().positive(),
  limit: z.number().int().min(1).max(500).default(100),
  cursor: z.string().optional()
});

interface JwtPayload {
  sub?: string;
  tenant_slug?: string;
  app_metadata?: {
    tenant_id?: string;
  };
}

const decodeJwtPayload = (token: string): JwtPayload | null => {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const decoded = atob(padded);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

const baseHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const allowedOrigins = new Set(
  (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
);

const buildHeaders = (origin: string | null) => {
  const headers = new Headers(baseHeaders);
  if (origin && allowedOrigins.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }
  return headers;
};

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  const headers = buildHeaders(origin);

  if (req.method === "OPTIONS") {
    if (!origin || !allowedOrigins.has(origin)) {
      return new Response(
        JSON.stringify({ success: false, error: "ORIGIN_NOT_ALLOWED" }),
        { status: 403, headers }
      );
    }
    return new Response("ok", { headers });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "METHOD_NOT_ALLOWED" }),
      { status: 405, headers }
    );
  }

  if (origin && !allowedOrigins.has(origin)) {
    return new Response(
      JSON.stringify({ success: false, error: "ORIGIN_NOT_ALLOWED" }),
      { status: 403, headers }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authHeader = req.headers.get("Authorization");

  if (!authHeader) {
    return new Response(
      JSON.stringify({ success: false, error: "MISSING_AUTH_HEADER" }),
      { status: 401, headers }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const payload = decodeJwtPayload(authHeader.replace("Bearer ", ""));
  if (!payload?.sub) {
    return new Response(
      JSON.stringify({ success: false, error: "INVALID_TOKEN" }),
      { status: 401, headers }
    );
  }

  const tenantId = payload.app_metadata?.tenant_id;
  const tenantSlug = payload.tenant_slug;

  if (!tenantId && !tenantSlug) {
    return new Response(
      JSON.stringify({ success: false, error: "MISSING_TENANT_INFO" }),
      { status: 400, headers }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: "INVALID_JSON" }),
      { status: 400, headers }
    );
  }

  const parseResult = InputSchema.safeParse(body);
  if (!parseResult.success) {
    return new Response(
      JSON.stringify({ success: false, error: "INVALID_INPUT", details: parseResult.error.issues }),
      { status: 400, headers }
    );
  }

  const { table, since, limit, cursor } = parseResult.data;
  const sinceDate = new Date(since).toISOString();

  let query = supabase
    .from(table)
    .select("*")
    .is("deleted_at", null)
    .gte("updated_at", sinceDate)
    .order("updated_at", { ascending: true })
    .limit(limit + 1);

  if (tenantId) {
    query = query.eq("tenant_id", tenantId);
  } else if (tenantSlug) {
    query = query.eq("tenant_slug", tenantSlug);
  }

  if (cursor) {
    try {
      const decodedCursor = atob(cursor);
      const cursorDate = new Date(decodedCursor).toISOString();
      query = query.gt("updated_at", cursorDate);
    } catch {
      // Ignorar cursor inválido
    }
  }

  const { data, error } = await query;

  if (error) {
    return new Response(
      JSON.stringify({ success: false, error: "QUERY_FAILED", details: error.message }),
      { status: 500, headers }
    );
  }

  const hasMore = data ? data.length > limit : false;
  const results = hasMore ? data.slice(0, limit) : data;
  let nextCursor: string | null = null;

  if (hasMore && results.length > 0) {
    const lastItem = results[results.length - 1];
    const lastUpdatedAt = lastItem.updated_at;
    if (lastUpdatedAt) {
      nextCursor = btoa(lastUpdatedAt);
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      data: results,
      nextCursor,
      hasMore,
      syncedAt: new Date().toISOString()
    }),
    { status: 200, headers }
  );
});