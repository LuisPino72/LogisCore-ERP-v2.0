import { createClient } from "jsr:@supabase/supabase-js@2.49.1";

const jsonHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

interface AuditLogInput {
  action: string;
  metadata?: Record<string, unknown>;
  targetTable?: string;
  targetId?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: jsonHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization");

  if (!authHeader) {
    return new Response(
      JSON.stringify({ success: false, error: "MISSING_AUTH_HEADER" }),
      { status: 401, headers: jsonHeaders }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } }
  });

  try {
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "INVALID_USER_TOKEN" }),
        { status: 401, headers: jsonHeaders }
      );
    }

    const { action, metadata, targetTable, targetId }: AuditLogInput = await req.json();
    
    // Get tenant_id from user_roles
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("tenant_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const tenantId = userRole?.tenant_id || null;

    // Insert audit log entry with ENFORCED identity
    const { error } = await supabase.from("audit_log_entries").insert({
      tenant_id: tenantId,
      user_id: user.id,
      event_type: action,
      target_table: targetTable || null,
      target_id: targetId || null,
      details: { 
        ...metadata,
        email: user.email,
        timestamp: new Date().toISOString()
      },
      ip_address: req.headers.get("x-forwarded-for") || 
                  req.headers.get("x-real-ip") || 
                  null
    });

    if (error) {
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 400, headers: jsonHeaders }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: jsonHeaders }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: jsonHeaders }
    );
  }
});
