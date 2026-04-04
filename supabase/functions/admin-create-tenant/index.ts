import { createClient } from "jsr:@supabase/supabase-js@2.49.1";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const jsonHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

interface CreateTenantInput {
  name: string;
  slug: string;
  ownerEmail: string;
  planId: string;
  trialDays?: number;
  businessTypeId?: string;
  contactEmail?: string;
  phone?: string;
  address?: string;
  logoUrl?: string;
  taxpayerInfo?: {
    rif: string;
    razonSocial: string;
    direccionFiscal: string;
    regimen?: string;
  };
}

interface CreateTenantResult {
  success: boolean;
  tenant?: {
    id: string;
    name: string;
    slug: string;
  };
  error?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: jsonHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  // Usar service role key del entorno de Supabase directamente
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  // Verificar que es admin (Bearer token en el header)
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ success: false, error: "Unauthorized" } as CreateTenantResult),
      { status: 401, headers: jsonHeaders }
    );
  }

  try {
    const input: CreateTenantInput = await req.json();

    if (!input.name || !input.slug || !input.ownerEmail || !input.planId) {
      return new Response(
        JSON.stringify({ success: false, error: "Faltan campos requeridos" } as CreateTenantResult),
        { status: 400, headers: jsonHeaders }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Crear usuario en auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: input.ownerEmail,
      email_confirm: true
    });

    if (authError || !authData.user) {
      return new Response(
        JSON.stringify({ success: false, error: authError?.message ?? "No se pudo crear el usuario" } as CreateTenantResult),
        { status: 400, headers: jsonHeaders }
      );
    }

    // 2. Crear tenant
    const insertData: Record<string, unknown> = {
      name: input.name,
      slug: input.slug,
      owner_user_id: authData.user.id,
      contact_email: input.contactEmail,
      phone: input.phone,
      address: input.address,
      business_type_id: input.businessTypeId,
      logo_url: input.logoUrl,
      taxpayer_info: input.taxpayerInfo,
      is_active: true
    };

    const { data: tenantData, error: tenantError } = await supabase
      .from("tenants")
      .insert(insertData)
      .select()
      .single();

    if (tenantError || !tenantData) {
      // Rollback: eliminar usuario creado
      await supabase.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ success: false, error: tenantError?.message ?? "Error al crear tenant" } as CreateTenantResult),
        { status: 400, headers: jsonHeaders }
      );
    }

    // 3. Crear rol de owner
    const { error: roleError } = await supabase.from("user_roles").insert({
      user_id: authData.user.id,
      tenant_id: tenantData.id,
      role: "owner",
      email: input.ownerEmail,
      is_active: true
    });

    if (roleError) {
      console.error("Error creating user_roles:", roleError.message);
    }

    // 4. Crear suscripción inicial
    const trialDays = input.trialDays || 0;
    const isTrial = trialDays > 0;
    const daysToAdd = isTrial ? trialDays : 30;

    const { error: subError } = await supabase.from("subscriptions").insert({
      tenant_id: tenantData.id,
      plan_id: input.planId,
      status: isTrial ? "trial" : "active",
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000).toISOString(),
      billing_cycle: "monthly",
      trial_days: trialDays
    });

    if (subError) {
      console.error("Error creating subscription:", subError.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        tenant: {
          id: tenantData.id,
          name: tenantData.name,
          slug: tenantData.slug
        }
      } as CreateTenantResult),
      { headers: jsonHeaders }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: String(error) } as CreateTenantResult),
      { status: 500, headers: jsonHeaders }
    );
  }
});
