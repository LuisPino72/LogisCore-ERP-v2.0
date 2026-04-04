import { createClient } from "jsr:@supabase/supabase-js@2.49.1";

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: jsonHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  try {
    let input: CreateTenantInput;
    try {
      input = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON body" }),
        { status: 400, headers: jsonHeaders }
      );
    }

    if (!input.name || !input.slug || !input.ownerEmail || !input.planId) {
      return new Response(
        JSON.stringify({ success: false, error: "Faltan campos requeridos: name, slug, ownerEmail, planId" }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: input.ownerEmail,
      email_confirm: true
    });

    if (authError || !authData.user) {
      return new Response(
        JSON.stringify({ success: false, error: authError?.message ?? "Error al crear usuario" }),
        { status: 400, headers: jsonHeaders }
      );
    }

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
      await supabase.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ success: false, error: tenantError?.message ?? "Error al crear tenant" }),
        { status: 400, headers: jsonHeaders }
      );
    }

    await supabase.from("user_roles").insert({
      user_id: authData.user.id,
      tenant_id: tenantData.id,
      role: "owner",
      email: input.ownerEmail,
      is_active: true
    });

    const trialDays = input.trialDays || 0;
    const isTrial = trialDays > 0;
    const daysToAdd = isTrial ? trialDays : 30;

    await supabase.from("subscriptions").insert({
      tenant_id: tenantData.id,
      plan_id: input.planId,
      status: isTrial ? "trial" : "active",
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000).toISOString(),
      billing_cycle: "monthly",
      trial_days: trialDays
    });

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
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: jsonHeaders }
    );
  }
});
