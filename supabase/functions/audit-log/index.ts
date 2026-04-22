import { createClient } from "jsr:@supabase/supabase-js@2.49.1";

const baseHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

interface AuditLogInput {
  action: string;
  metadata?: Record<string, unknown>;
  targetTable?: string;
  targetId?: string;
}

const MAX_ACTION_LENGTH = 80;
const MAX_METADATA_BYTES = 8_192;
const actionPattern = /^[A-Z0-9._-]{3,80}$/;
const tablePattern = /^[a-z_][a-z0-9_]{1,62}$/;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

  try {
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "INVALID_USER_TOKEN" }),
        { status: 401, headers }
      );
    }

    const { action, metadata, targetTable, targetId }: AuditLogInput = await req.json();

    if (
      typeof action !== "string" ||
      action.length > MAX_ACTION_LENGTH ||
      !actionPattern.test(action)
    ) {
      return new Response(
        JSON.stringify({ success: false, error: "INVALID_ACTION" }),
        { status: 400, headers }
      );
    }

    if (targetTable && !tablePattern.test(targetTable)) {
      return new Response(
        JSON.stringify({ success: false, error: "INVALID_TARGET_TABLE" }),
        { status: 400, headers }
      );
    }

    if (targetId && !uuidPattern.test(targetId)) {
      return new Response(
        JSON.stringify({ success: false, error: "INVALID_TARGET_ID" }),
        { status: 400, headers }
      );
    }

    if (metadata && (typeof metadata !== "object" || Array.isArray(metadata))) {
      return new Response(
        JSON.stringify({ success: false, error: "INVALID_METADATA" }),
        { status: 400, headers }
      );
    }

    const safeMetadata = metadata ?? {};
    const metadataBytes = new TextEncoder().encode(JSON.stringify(safeMetadata)).length;
    if (metadataBytes > MAX_METADATA_BYTES) {
      return new Response(
        JSON.stringify({ success: false, error: "METADATA_TOO_LARGE" }),
        { status: 413, headers }
      );
    }

    const { data: userRole, error: roleError } = await supabase
      .from("user_roles")
      .select("tenant_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const isAdmin = user.app_metadata?.role === "admin";

    if (!isAdmin && (roleError || !userRole?.tenant_id)) {
      return new Response(
        JSON.stringify({ success: false, error: "TENANT_CONTEXT_REQUIRED" }),
        { status: 403, headers }
      );
    }

    const { error } = await supabase.from("audit_log_entries").insert({
      tenant_id: userRole?.tenant_id || null,
      user_id: user.id,
      event_type: action,
      target_table: targetTable || null,
      target_local_id: targetId || null,
      details: { 
        ...safeMetadata,
        email: user.email,
        timestamp: new Date().toISOString()
      },
      ip_address: req.headers.get("x-forwarded-for") || 
                  req.headers.get("x-real-ip") || 
                  null,
      user_agent: req.headers.get("user-agent") || null
    });

    if (error) {
      return new Response(
        JSON.stringify({ success: false, error: "AUDIT_INSERT_FAILED" }),
        { status: 400, headers }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers }
    );

  } catch {
    return new Response(
      JSON.stringify({ success: false, error: "INTERNAL_ERROR" }),
      { status: 500, headers }
    );
  }
});
