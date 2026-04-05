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
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    const formattedLogs: AuditLogEntry[] = (auditLogs || []).map(log => ({
      id: log.id,
      timestamp: log.created_at,
      action: log.action,
      userId: log.actor_id,
      email: log.actor_email,
      metadata: log.metadata
    }));

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
