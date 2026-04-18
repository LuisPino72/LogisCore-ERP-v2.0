export interface RbacResult {
  ok: boolean;
  data?: {
    tenantId: string;
    userId: string;
    role: string;
  };
  error?: {
    code: string;
    message?: string;
  };
}

export async function createRbacMiddleware(permission: string) {
  return async (req: Request): Promise<RbacResult> => {
    try {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return { ok: false, error: { code: "UNAUTHORIZED" } };
      }

      const token = authHeader.replace("Bearer ", "");
      
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      
      const supabase = await import("jsr:@supabase/supabase-js@2.49.1").then(m => 
        m.createClient(supabaseUrl, supabaseServiceKey)
      );

      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        return { ok: false, error: { code: "INVALID_TOKEN" } };
      }

      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("tenant_id, role")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (roleError || !roleData) {
        return { ok: false, error: { code: "ROLE_NOT_FOUND" } };
      }

      return {
        ok: true,
        data: {
          tenantId: roleData.tenant_id,
          userId: user.id,
          role: roleData.role
        }
      };
    } catch (error) {
      return { ok: false, error: { code: "RBAC_ERROR", message: String(error) } };
    }
  };
}