import { createClient } from "jsr:@supabase/supabase-js@2.49.1";

const jsonHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    regimen?: string;
  };
  ownerUserId?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: jsonHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  try {
    const { action, tenantId, data, permanent } = await req.json();
    
    if (!tenantId) {
      return new Response(
        JSON.stringify({ success: false, error: "Faltan parámetros: tenantId" }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    return new Response(
      JSON.stringify({ success: false, error: "Acción no válida. Use: update, deactivate, o delete" }),
      { status: 400, headers: jsonHeaders }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: jsonHeaders }
    );
  }
});