import { createClient } from "jsr:@supabase/supabase-js@2.49.1";
import { createRbacMiddleware } from "../_shared/rbac-middleware";

const jsonHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-action-context, x-user-permissions",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

interface UpdateTenantInput {
  name?: string;
  businessTypeId?: string;
  isActive?: boolean;
  logoUrl?: string;
  contactEmail?: string;
  phone?: string;
  address?: string;
  timezone?: string;
  currency?: string;
  taxpayerInfo?: {
    rif?: string;
    razonSocial?: string;
    direccionFiscal?: string;
  };
  ownerUserId?: string;
}

interface EmployeeManagement {
  email: string;
  fullName?: string;
  password?: string;
  action: "create" | "update" | "delete";
  userId?: string;
  permissions?: string[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: jsonHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  try {
    const rbacMiddleware = await createRbacMiddleware("ADMIN:TENANT");
    const rbacResult = await rbacMiddleware(req);
    
    if (!rbacResult.ok) {
      return new Response(
        JSON.stringify({ success: false, error: rbacResult.error.code }),
        { status: 403, headers: jsonHeaders }
      );
    }

    const { userId, tenantId } = rbacResult.data;
    
    const { action, data, permanent } = await req.json();
    
    if (!tenantId) {
      return new Response(
        JSON.stringify({ success: false, error: "Faltan parámetros: tenantId" }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get tenant info first
    const { data: tenantInfo, error: tenantInfoError } = await supabase
      .from("tenants")
      .select("id, slug")
      .eq("id", tenantId)
      .single();

    if (tenantInfoError || !tenantInfo) {
      return new Response(
        JSON.stringify({ success: false, error: "Tenant no encontrado" }),
        { status: 400, headers: jsonHeaders }
      );
    }

    if (action === "update") {
      if (!data) {
        return new Response(
          JSON.stringify({ success: false, error: "Faltan datos para actualizar" }),
          { status: 400, headers: jsonHeaders }
        );
      }

      const input: UpdateTenantInput = data;
      const updateData: Record<string, unknown> = {};
      
      if (input.name !== undefined && input.name !== "") updateData.name = input.name;
      if (input.businessTypeId !== undefined) updateData.business_type_id = input.businessTypeId || null;
      if (input.isActive !== undefined) updateData.is_active = input.isActive;
      if (input.logoUrl !== undefined) updateData.logo_url = input.logoUrl || null;
      if (input.contactEmail !== undefined) updateData.contact_email = input.contactEmail || null;
      if (input.phone !== undefined) updateData.phone = input.phone || null;
      if (input.address !== undefined) updateData.address = input.address || null;
      if (input.timezone !== undefined) updateData.timezone = input.timezone || null;
      if (input.currency !== undefined) updateData.currency = input.currency || null;
      if (input.taxpayerInfo !== undefined) updateData.taxpayer_info = input.taxpayerInfo || null;
      if (input.ownerUserId !== undefined) updateData.owner_user_id = input.ownerUserId || null;

      if (Object.keys(updateData).length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: "No hay campos para actualizar" }),
          { status: 400, headers: jsonHeaders }
        );
      }

      const { data: tenantData, error: tenantError } = await supabase
        .from("tenants")
        .update(updateData)
        .eq("id", tenantId)
        .select()
        .single();

      if (tenantError || !tenantData) {
        return new Response(
          JSON.stringify({ success: false, error: tenantError?.message ?? "Error al actualizar tenant" }),
          { status: 400, headers: jsonHeaders }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          tenant: {
            id: tenantData.id,
            name: tenantData.name,
            slug: tenantData.slug
          }
        }),
        { headers: jsonHeaders }
      );
    }

    if (action === "deactivate") {
      const { data: tenantData, error: tenantError } = await supabase
        .from("tenants")
        .update({ is_active: false })
        .eq("id", tenantId)
        .select()
        .single();

      if (tenantError || !tenantData) {
        return new Response(
          JSON.stringify({ success: false, error: tenantError?.message ?? "Error al desactivar tenant" }),
          { status: 400, headers: jsonHeaders }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          tenant: {
            id: tenantData.id,
            name: tenantData.name,
            slug: tenantData.slug
          }
        }),
        { headers: jsonHeaders }
      );
    }

    if (action === "delete") {
      if (permanent) {
        const { data: usersToDelete } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("tenant_id", tenantId);

        if (usersToDelete && usersToDelete.length > 0) {
          for (const user of usersToDelete) {
            const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(user.user_id);
            if (deleteAuthError) {
              console.error("Error deleting user from auth:", deleteAuthError);
            }
          }
        }

        await supabase.from("subscriptions").delete().eq("tenant_id", tenantId);
        await supabase.from("user_roles").delete().eq("tenant_id", tenantId);

        const { error: deleteError } = await supabase
          .from("tenants")
          .delete()
          .eq("id", tenantId);

        if (deleteError) {
          console.error("Error deleting tenant:", deleteError);
          return new Response(
            JSON.stringify({ success: false, error: deleteError.message }),
            { status: 400, headers: jsonHeaders }
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: jsonHeaders }
        );
      } else {
        const { data: tenantData, error: tenantError } = await supabase
          .from("tenants")
          .update({ is_active: false })
          .eq("id", tenantId)
          .select()
          .single();

        if (tenantError || !tenantData) {
          return new Response(
            JSON.stringify({ success: false, error: tenantError?.message ?? "Error al desactivar tenant" }),
            { status: 400, headers: jsonHeaders }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            tenant: {
              id: tenantData.id,
              name: tenantData.name,
              slug: tenantData.slug
            }
          }),
          { headers: jsonHeaders }
        );
      }
    }

    if (action === "manage_employees") {
      const employees = data?.employees as EmployeeManagement[] | undefined;
      
      if (!employees || !Array.isArray(employees)) {
        return new Response(
          JSON.stringify({ success: false, error: "Se requiere un array de empleados" }),
          { status: 400, headers: jsonHeaders }
        );
      }

      const results: Array<{ email: string; success: boolean; userId?: string; error?: string }> = [];

      for (const emp of employees) {
        try {
          if (emp.action === "create") {
            if (!emp.email || !emp.password || !emp.fullName) {
              results.push({ email: emp.email, success: false, error: "Faltan datos para crear empleado" });
              continue;
            }

            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
              email: emp.email,
              password: emp.password,
              email_confirm: true,
              user_metadata: { full_name: emp.fullName }
            });

            if (authError || !authData.user) {
              results.push({ email: emp.email, success: false, error: authError?.message });
              continue;
            }

            await supabase.from("user_roles").insert({
              user_id: authData.user.id,
              tenant_id: tenantId,
              role: "employee",
              email: emp.email,
              full_name: emp.fullName,
              is_active: true,
              permissions: emp.permissions || []
            });

            results.push({ email: emp.email, success: true, userId: authData.user.id });
          } 
          else if (emp.action === "update") {
            if (!emp.userId) {
              results.push({ email: emp.email, success: false, error: "userId requerido para actualizar" });
              continue;
            }

            const updateData: Record<string, unknown> = {};
            if (emp.fullName) updateData.full_name = emp.fullName;
            if (emp.email) updateData.email = emp.email;
            if (emp.permissions) updateData.permissions = emp.permissions;

            await supabase.from("user_roles").update(updateData).eq("user_id", emp.userId);
            results.push({ email: emp.email, success: true, userId: emp.userId });
          } 
          else if (emp.action === "delete") {
            if (!emp.userId) {
              results.push({ email: emp.email, success: false, error: "userId requerido para eliminar" });
              continue;
            }

            const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(emp.userId);
            if (deleteAuthError) {
              console.error("Error deleting user from auth:", deleteAuthError);
            }
            
            await supabase.from("user_roles").delete().eq("user_id", emp.userId);
            results.push({ email: emp.email, success: true, userId: emp.userId });
          }
        } catch (err) {
          results.push({ email: emp.email, success: false, error: String(err) });
        }
      }

      const allSuccess = results.every(r => r.success);
      return new Response(
        JSON.stringify({
          success: allSuccess,
          employees: results
        }),
        { headers: jsonHeaders }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Acción no válida. Use: update, deactivate, delete, o manage_employees" }),
      { status: 400, headers: jsonHeaders }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: jsonHeaders }
    );
  }
});
