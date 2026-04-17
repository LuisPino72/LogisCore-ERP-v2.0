import { createClient } from "jsr:@supabase/supabase-js@2.49.1";
import { createRbacMiddleware } from "../_shared/rbac-middleware";

const jsonHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "https://logiscore-erp.vercel.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-action-context, x-user-permissions",
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
    const rbacMiddleware = await createRbacMiddleware("ADMIN:USERS");
    const rbacResult = await rbacMiddleware(req);
    
    if (!rbacResult.ok) {
      return new Response(
        JSON.stringify({ success: false, error: rbacResult.error.code }),
        { status: 403, headers: jsonHeaders }
      );
    }

    const { userId, tenantId } = rbacResult.data;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    const { data: auditLogs, error: auditError } = await supabase
      .from("audit_log_entries")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (auditError) {
      console.error("Error fetching audit logs:", auditError);
    }

    const { count } = await supabase
      .from("audit_log_entries")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId);

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
