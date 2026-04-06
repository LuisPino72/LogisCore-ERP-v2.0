import { createClient } from "jsr:@supabase/supabase-js@2.49.1";

const jsonHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

interface AuditLogInput {
  action: string;
  userId: string | null;
  email: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: jsonHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  try {
    const { action, userId, email }: AuditLogInput = await req.json();
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extraer token JWT para obtener el tenant_id
    const authHeader = req.headers.get("Authorization");
    let tenantId: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      
      if (user) {
        // Obtener tenant_id desde user_roles
        const { data: userRole } = await supabase
          .from("user_roles")
          .select("tenant_id")
          .eq("user_id", user.id)
          .maybeSingle();
        
        tenantId = userRole?.tenant_id || null;
      }
    }

    // Insertar con el esquema correcto de audit_log_entries
    const { error } = await supabase.from("audit_log_entries").insert({
      action: action,
      actor_id: userId,
      actor_email: email,
      metadata: { timestamp: new Date().toISOString() }
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
