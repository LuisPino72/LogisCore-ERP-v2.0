import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { z } from "npm:zod@3.23.8";

const TableSchema = z.enum([
  "suppliers",
  "categories",
  "products",
  "product_presentations",
  "warehouses",
  "product_size_colors",
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

const OperationSchema = z.enum(["create", "update", "delete"]);

const InputSchema = z.object({
  table: TableSchema,
  operation: OperationSchema,
  localId: z.string().uuid(),
  payload: z.record(z.unknown()).optional()
});

const jsonHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

type JwtPayload = {
  sub?: string;
  tenant_slug?: string;
};

const decodeJwtPayload = (token: string): JwtPayload | null => {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
};

type DbRow = Record<string, unknown>;

const insertRecord = async (
  client: Awaited<ReturnType<typeof createClient>>,
  table: string,
  tenantId: string,
  localId: string,
  payload: DbRow
): Promise<{ success: boolean; error?: string }> => {
  const result = await client
    .from(table)
    .insert({
      ...payload,
      local_id: localId,
      tenant_id: tenantId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .maybeSingle();

  if (result.error) {
    return { success: false, error: result.error.message };
  }
  return { success: true };
};

const updateRecord = async (
  client: Awaited<ReturnType<typeof createClient>>,
  table: string,
  tenantId: string,
  localId: string,
  payload: DbRow
): Promise<{ success: boolean; error?: string }> => {
  const result = await client
    .from(table)
    .update({
      ...payload,
      updated_at: new Date().toISOString()
    })
    .eq("local_id", localId)
    .eq("tenant_id", tenantId)
    .select()
    .maybeSingle();

  if (result.error) {
    return { success: false, error: result.error.message };
  }
  return { success: true };
};

const deleteRecord = async (
  client: Awaited<ReturnType<typeof createClient>>,
  table: string,
  tenantId: string,
  localId: string
): Promise<{ success: boolean; error?: string }> => {
  const result = await client
    .from(table)
    .update({ deleted_at: new Date().toISOString() })
    .eq("local_id", localId)
    .eq("tenant_id", tenantId)
    .select()
    .maybeSingle();

  if (result.error) {
    return { success: false, error: result.error.message };
  }
  return { success: true };
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: jsonHeaders });
  }

  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "METHOD_NOT_ALLOWED" }),
      { status: 405, headers: jsonHeaders }
    );
  }

  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "MISSING_BEARER_TOKEN" }),
      { status: 401, headers: jsonHeaders }
    );
  }

  const token = authHeader.replace("Bearer ", "").trim();
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return new Response(
      JSON.stringify({ error: "MISSING_ENV_KEYS" }),
      { status: 500, headers: jsonHeaders }
    );
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

  const authResult = await authClient.auth.getUser(token);
  if (authResult.error || !authResult.data.user) {
    return new Response(
      JSON.stringify({ error: "INVALID_JWT" }),
      { status: 401, headers: jsonHeaders }
    );
  }

  let parsedBody: unknown = {};
  try {
    parsedBody = await request.json();
  } catch {
    parsedBody = {};
  }

  const parsedInput = InputSchema.safeParse(parsedBody);
  if (!parsedInput.success) {
    return new Response(
      JSON.stringify({
        error: "INVALID_INPUT",
        details: parsedInput.error.flatten()
      }),
      { status: 400, headers: jsonHeaders }
    );
  }

  const tokenPayload = decodeJwtPayload(token);
  const tokenTenantSlug = tokenPayload?.tenant_slug;
  if (!tokenTenantSlug) {
    return new Response(
      JSON.stringify({ error: "MISSING_TENANT_SLUG_CLAIM" }),
      { status: 403, headers: jsonHeaders }
    );
  }

  const tenantResult = await adminClient
    .from("tenants")
    .select("id, slug")
    .eq("slug", tokenTenantSlug)
    .maybeSingle<{ id: string; slug: string }>();

  if (tenantResult.error || !tenantResult.data) {
    return new Response(
      JSON.stringify({ error: "TENANT_NOT_FOUND" }),
      { status: 404, headers: jsonHeaders }
    );
  }

  const tenantId = tenantResult.data.id;
  const { table, operation, localId, payload } = parsedInput.data;

  let syncResult: { success: boolean; error?: string };

  switch (operation) {
    case "create":
      syncResult = await insertRecord(
        adminClient,
        table,
        tenantId,
        localId,
        payload ?? {}
      );
      break;
    case "update":
      syncResult = await updateRecord(
        adminClient,
        table,
        tenantId,
        localId,
        payload ?? {}
      );
      break;
    case "delete":
      syncResult = await deleteRecord(adminClient, table, tenantId, localId);
      break;
    default:
      syncResult = { success: false, error: "UNKNOWN_OPERATION" };
  }

  if (!syncResult.success) {
    const isConflict = syncResult.error?.toUpperCase().includes("DUPLICATE") ||
      syncResult.error?.toUpperCase().includes("UNIQUE");

    if (isConflict) {
      return new Response(
        JSON.stringify({
          error: "CONFLICT_DETECTED",
          details: syncResult.error
        }),
        { status: 409, headers: jsonHeaders }
      );
    }

    return new Response(
      JSON.stringify({
        error: "SYNC_FAILED",
        details: syncResult.error
      }),
      { status: 500, headers: jsonHeaders }
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      table,
      operation,
      localId,
      tenantId
    }),
    { status: 200, headers: jsonHeaders }
  );
});