import { createClient } from "jsr:@supabase/supabase-js@2.49.1";

const jsonHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS"
};

interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  userId: string | null;
  email: string | null;
  metadata: Record<string, unknown> | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: jsonHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "MISSING_BEARER_TOKEN" }),
        { status: 401, headers: jsonHeaders }
      );
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const authResult = await authClient.auth.getUser(token);
    if (authResult.error || !authResult.data.user) {
      return new Response(
        JSON.stringify({ success: false, error: "INVALID_JWT" }),
        { status: 401, headers: jsonHeaders }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleRow, error: roleError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("user_id", authResult.data.user.id)
      .eq("role", "admin")
      .eq("is_active", true)
      .maybeSingle();

    if (roleError || !roleRow) {
      return new Response(
        JSON.stringify({ success: false, error: "FORBIDDEN_ADMIN_ONLY" }),
        { status: 403, headers: jsonHeaders }
      );
    }

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    const { data: auditLogs, error: auditError } = await supabase
      .from("audit_log_entries")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (auditError) {
      console.error("Error fetching audit logs:", auditError);
    }

    const { count } = await supabase
      .from("audit_log_entries")
      .select("*", { count: "exact", head: true });

    const formattedLogs: AuditLogEntry[] = (auditLogs || []).map((log) => {
      const rawDetails = (log.details ?? log.metadata ?? null) as Record<string, unknown> | null;
      return {
        id: log.id,
        timestamp: log.created_at,
        action: (log.event_type ?? log.action ?? "UNKNOWN") as string,
        userId: (log.user_id ?? log.actor_id ?? null) as string | null,
        email: (rawDetails?.email as string | undefined) ?? (log.actor_email as string | undefined) ?? null,
        metadata: rawDetails
      };
    });

    return new Response(
      JSON.stringify({
        logs: formattedLogs,
        total: count || 0,
        limit,
        offset
      }),
      { headers: jsonHeaders }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: jsonHeaders }
    );
  }
});
