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
  app_metadata?: {
    tenant_id?: string;
  };
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

const protectedColumns = new Set([
  "id",
  "tenant_id",
  "tenant_slug",
  "local_id",
  "created_at",
  "updated_at",
  "deleted_at",
  // Columnas de productos globales - protegidas contra manipulación
  "is_global",
  "business_type_id"
]);

const sanitizeMutationPayload = (payload: DbRow): DbRow => {
  const sanitizedEntries = Object.entries(payload).filter(
    ([key]) => !protectedColumns.has(key)
  );
  return Object.fromEntries(sanitizedEntries);
};

// Validar que usuario normal no intente crear productos globales
const validateNoGlobalMutation = (table: string, payload: DbRow, role: string): boolean => {
  if (table !== "products") return true;
  if (payload.is_global === true && role !== "owner" && role !== "admin") {
    return false;
  }
  return true;
};

const insertRecord = async (
  client: Awaited<ReturnType<typeof createClient>>,
  table: string,
  tenantId: string,
  tenantSlug: string | null,
  localId: string,
  payload: DbRow
): Promise<{ success: boolean; error?: string }> => {
  const sanitizedPayload = sanitizeMutationPayload(payload);

  const insertData: Record<string, any> = {
    ...sanitizedPayload,
    local_id: localId,
    tenant_id: tenantId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Default values for products table to avoid "not-null" violations
  if (table === "products") {
    if (insertData.is_serialized === undefined || insertData.is_serialized === null) insertData.is_serialized = false;
    if (insertData.is_weighted === undefined || insertData.is_weighted === null) insertData.is_weighted = false;
    if (insertData.is_taxable === undefined || insertData.is_taxable === null) insertData.is_taxable = true;
    if (insertData.visible === undefined || insertData.visible === null) insertData.visible = true;
  }

  const tablesWithSlug = ["products", "categories", "product_presentations"];
  if (tenantSlug && tablesWithSlug.includes(table)) {
    insertData.tenant_slug = tenantSlug;
  }

  console.log(`[SYNC] Attempting insert into ${table}. Data keys:`, Object.keys(insertData));
  
  const result = await client
    .from(table)
    .insert(insertData)
    .select()
    .maybeSingle();

  if (result.error) {
    console.error(`[SYNC] DATABASE ERROR for ${table}:`, {
      code: result.error.code,
      message: result.error.message,
      details: result.error.details,
      hint: result.error.hint
    });
    return { success: false, error: `${result.error.message} (${result.error.code})` };
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
  const sanitizedPayload = sanitizeMutationPayload(payload);

  console.log(`[SYNC] Updating ${table} (${localId}) for tenant ${tenantId}`);

  const result = await client
    .from(table)
    .update({
      ...sanitizedPayload,
      updated_at: new Date().toISOString()
    })
    .eq("local_id", localId)
    .eq("tenant_id", tenantId)
    .select()
    .maybeSingle();

  if (result.error) {
    console.error(`[SYNC] Update error for ${table} (${localId}):`, result.error);
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
  console.log(`[SYNC] Deleting (soft) ${table} (${localId}) for tenant ${tenantId}`);
  
  const result = await client
    .from(table)
    .update({ deleted_at: new Date().toISOString() })
    .eq("local_id", localId)
    .eq("tenant_id", tenantId)
    .select()
    .maybeSingle();

  if (result.error) {
    console.error(`[SYNC] Delete error for ${table} (${localId}):`, result.error);
    return { success: false, error: result.error.message };
  }
  return { success: true };
};

Deno.serve(async (request) => {
  try {
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

    let parsedBody: any = {};
    try {
      parsedBody = await request.json();
    } catch {
      parsedBody = {};
    }

    const parsedInput = InputSchema.safeParse(parsedBody);
    if (!parsedInput.success) {
      console.error("[SYNC] Validation Error:", parsedInput.error.format());
      return new Response(
        JSON.stringify({ error: "INVALID_INPUT", details: parsedInput.error.flatten() }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const { table, operation, localId, payload } = parsedInput.data;
    console.log(`[SYNC] Operation: ${operation} on Table: ${table}. LocalId: ${localId}`);
    console.log("[SYNC] Raw Payload:", JSON.stringify(payload));

    const userId = authResult.data.user.id;
    const tokenPayload = decodeJwtPayload(token);
    const tokenTenantId = tokenPayload?.app_metadata?.tenant_id;
    const tokenTenantSlug = tokenPayload?.tenant_slug;

    let tenantId: string | null = null;
    let tenantSlug: string | null = null;

    if (tokenTenantId) {
      const tenantFromToken = await adminClient
        .from("tenants")
        .select("id, slug")
        .eq("id", tokenTenantId)
        .maybeSingle<{ id: string; slug: string }>();

      if (tenantFromToken.error || !tenantFromToken.data) {
        return new Response(
          JSON.stringify({ error: "TENANT_NOT_FOUND_BY_TOKEN_ID" }),
          { status: 404, headers: jsonHeaders }
        );
      }

      tenantId = tenantFromToken.data.id;
      tenantSlug = tenantFromToken.data.slug;
    } else if (tokenTenantSlug) {
      const tenantFromSlug = await adminClient
        .from("tenants")
        .select("id, slug")
        .eq("slug", tokenTenantSlug)
        .maybeSingle<{ id: string; slug: string }>();

      if (tenantFromSlug.error || !tenantFromSlug.data) {
        return new Response(
          JSON.stringify({ error: "TENANT_NOT_FOUND_BY_TOKEN_SLUG" }),
          { status: 404, headers: jsonHeaders }
        );
      }

      tenantId = tenantFromSlug.data.id;
      tenantSlug = tenantFromSlug.data.slug;
    } else {
      const roleLookup = await adminClient
        .from("user_roles")
        .select("tenant_id")
        .eq("user_id", userId)
        .eq("is_active", true)
        .limit(2);

      if (roleLookup.error || !roleLookup.data || roleLookup.data.length === 0) {
        return new Response(
          JSON.stringify({ error: "TENANT_CONTEXT_MISSING" }),
          { status: 403, headers: jsonHeaders }
        );
      }

      if (roleLookup.data.length > 1) {
        return new Response(
          JSON.stringify({ error: "TENANT_CONTEXT_AMBIGUOUS" }),
          { status: 403, headers: jsonHeaders }
        );
      }

      tenantId = roleLookup.data[0]!.tenant_id as string | null;
      if (!tenantId) {
        return new Response(
          JSON.stringify({ error: "TENANT_CONTEXT_MISSING" }),
          { status: 403, headers: jsonHeaders }
        );
      }

      const tenantFromRole = await adminClient
        .from("tenants")
        .select("id, slug")
        .eq("id", tenantId)
        .maybeSingle<{ id: string; slug: string }>();

      if (tenantFromRole.error || !tenantFromRole.data) {
        return new Response(
          JSON.stringify({ error: "TENANT_NOT_FOUND_BY_ROLE" }),
          { status: 404, headers: jsonHeaders }
        );
      }

      tenantSlug = tenantFromRole.data.slug;
    }

    const membership = await adminClient
      .from("user_roles")
      .select("tenant_id, role, is_active")
      .eq("user_id", userId)
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .maybeSingle<{ tenant_id: string; role: string; is_active: boolean }>();

    if (membership.error || !membership.data) {
      return new Response(
        JSON.stringify({ error: "FORBIDDEN_TENANT_ACCESS" }),
        { status: 403, headers: jsonHeaders }
      );
    }

    const userRole = membership.data.role;
    if (!validateNoGlobalMutation(table, payload ?? {}, userRole)) {
      return new Response(
        JSON.stringify({ error: "FORBIDDEN_GLOBAL_MUTATION" }),
        { status: 403, headers: jsonHeaders }
      );
    }

    let syncResult: { success: boolean; error?: string };

    switch (operation) {
      case "create":
        syncResult = await insertRecord(
          adminClient,
          table,
          tenantId,
          tenantSlug,
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
      console.error(`[SYNC] Operation ${operation} failed for ${table}:`, syncResult.error);
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

    console.log(`[SYNC] Operation ${operation} successful for ${table} (${localId})`);

    return new Response(
      JSON.stringify({
        success: true,
        table,
        operation,
        localId,
        tenantId,
        tenantSlug
      }),
      { status: 200, headers: jsonHeaders }
    );
  } catch (err: any) {
    console.error("Critical Function Error:", err);
    return new Response(
      JSON.stringify({ 
        error: "INTERNAL_SERVER_ERROR", 
        message: err.message,
        stack: err.stack 
      }),
      { status: 500, headers: jsonHeaders }
    );
  }
});
