import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { z } from "npm:zod@3.23.8";

const InputSchema = z.object({
  tenantSlug: z.string().min(1).optional()
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

  const inputTenantSlug = parsedInput.data.tenantSlug;
  if (inputTenantSlug && inputTenantSlug !== tokenTenantSlug) {
    return new Response(
      JSON.stringify({ error: "TENANT_SLUG_MISMATCH" }),
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

  const subscriptionResult = await adminClient
    .from("subscriptions")
    .select("status")
    .eq("tenant_id", tenantResult.data.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ status: string }>();

  if (subscriptionResult.error) {
    return new Response(
      JSON.stringify({
        error: "SUBSCRIPTION_QUERY_FAILED",
        details: subscriptionResult.error.message
      }),
      { status: 500, headers: jsonHeaders }
    );
  }

  const status = subscriptionResult.data?.status ?? null;
  const isActive = status === "active";

  return new Response(
    JSON.stringify({
      isActive,
      status,
      tenantSlug: tokenTenantSlug
    }),
    { status: 200, headers: jsonHeaders }
  );
});
