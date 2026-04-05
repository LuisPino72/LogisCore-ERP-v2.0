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
  ownerPassword: string;
  ownerFullName: string;
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
  employees?: Array<{
    email: string;
    password: string;
    fullName: string;
  }>;
  hasWarehouse?: boolean;
  warehouse?: {
    name: string;
    address?: string;
    isDefault?: boolean;
  };
}

const DEFAULT_CATEGORIES_BY_BUSINESS_TYPE: Record<string, string[]> = {
  "Bodega": [
    "Bebidas",
    "Galletas",
    "Panadería",
    "Abarrotes",
    "Víveres",
    "Lácteos",
    "Frituras",
    "Confitería",
    "Productos Frescos",
    "Varios"
  ],
  "Manufactura": [
    "Materia Prima",
    "Producto Terminado",
    "Insumos",
    "Empaque",
    "Herramientas",
    "Maquinaria",
    "Mantenimiento",
    "Control de Calidad",
    "Producción",
    "Envases"
  ],
  "Restaurante": [
    "Bebidas",
    "Comidas",
    "Postres",
    "Despensa",
    "Panadería",
    "Delivery",
    "Reservas",
    "Catering",
    "Personal",
    "Mesas"
  ],
  "Servicios": [
    "Consultoría",
    "Servicios",
    "Repuestos",
    "Mantenimiento",
    "Alquiler",
    "Delivery",
    "Caja",
    "Inventario",
    "Reportes",
    "Auditoría"
  ],
  "Otro": [
    "General"
  ]
};

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

    const requiredFields = ["name", "slug", "ownerEmail", "ownerPassword", "ownerFullName", "planId"];
    const missingFields = requiredFields.filter(f => !input[f as keyof CreateTenantInput]);
    if (missingFields.length > 0) {
      return new Response(
        JSON.stringify({ success: false, error: `Faltan campos requeridos: ${missingFields.join(", ")}` }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: input.ownerEmail,
      password: input.ownerPassword,
      email_confirm: true,
      user_metadata: { full_name: input.ownerFullName }
    });

    if (authError || !authData.user) {
      return new Response(
        JSON.stringify({ success: false, error: authError?.message ?? "Error al crear usuario owner" }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const ownerUserId = authData.user.id;

    const insertData: Record<string, unknown> = {
      name: input.name,
      slug: input.slug,
      owner_user_id: ownerUserId,
      contact_email: input.contactEmail || null,
      phone: input.phone || null,
      address: input.address || null,
      business_type_id: input.businessTypeId || null,
      logo_url: input.logoUrl || null,
      taxpayer_info: input.taxpayerInfo || null,
      is_active: true
    };

    const { data: tenantData, error: tenantError } = await supabase
      .from("tenants")
      .insert(insertData)
      .select()
      .single();

    if (tenantError || !tenantData) {
      await supabase.auth.admin.deleteUser(ownerUserId);
      return new Response(
        JSON.stringify({ success: false, error: tenantError?.message ?? "Error al crear tenant" }),
        { status: 400, headers: jsonHeaders }
      );
    }

    const tenantId = tenantData.id;

    await supabase.from("user_roles").insert({
      user_id: ownerUserId,
      tenant_id: tenantId,
      role: "owner",
      email: input.ownerEmail,
      full_name: input.ownerFullName,
      is_active: true
    });

    const employees = input.employees || [];
    const createdEmployees: Array<{ email: string; userId: string; fullName: string }> = [];
    
    for (const emp of employees) {
      if (!emp.email || !emp.password || !emp.fullName) continue;
      
      const { data: empAuthData, error: empAuthError } = await supabase.auth.admin.createUser({
        email: emp.email,
        password: emp.password,
        email_confirm: true,
        user_metadata: { full_name: emp.fullName }
      });

      if (empAuthError || !empAuthData.user) {
        console.error("Error creating employee:", empAuthError?.message);
        continue;
      }

      const empUserId = empAuthData.user.id;
      
      await supabase.from("user_roles").insert({
        user_id: empUserId,
        tenant_id: tenantId,
        role: "employee",
        email: emp.email,
        full_name: emp.fullName,
        is_active: true
      });

      createdEmployees.push({
        email: emp.email,
        userId: empUserId,
        fullName: emp.fullName
      });
    }

    if (input.hasWarehouse && input.warehouse?.name) {
      await supabase.from("warehouses").insert({
        local_id: crypto.randomUUID(),
        tenant_id: tenantId,
        name: input.warehouse.name,
        address: input.warehouse.address || null,
        is_default: input.warehouse.isDefault ?? true,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    let businessTypeName = "Otro";
    let categoriesCreatedCount = 0;

    if (input.businessTypeId) {
      const { data: btData } = await supabase
        .from("business_types")
        .select("name")
        .eq("id", input.businessTypeId)
        .single();
      
      businessTypeName = btData?.name || "Otro";
      const categories = DEFAULT_CATEGORIES_BY_BUSINESS_TYPE[businessTypeName] || DEFAULT_CATEGORIES_BY_BUSINESS_TYPE["Otro"];
      categoriesCreatedCount = categories.length;
      const tenantSlug = tenantData.slug;
      
      for (const catName of categories) {
        await supabase.from("categories").insert({
          local_id: crypto.randomUUID(),
          tenant_id: tenantId,
          tenant_slug: tenantSlug,
          name: catName,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    }

    const trialDays = input.trialDays || 0;
    const isTrial = trialDays > 0;
    const daysToAdd = isTrial ? trialDays : 30;

    const { error: subError } = await supabase.from("subscriptions").insert({
      tenant_id: tenantId,
      plan_id: input.planId,
      status: isTrial ? "trial" : "active",
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000).toISOString(),
      billing_cycle: "monthly",
      trial_days: trialDays
    });

    if (subError) {
      return new Response(
        JSON.stringify({ success: false, error: "Error al crear suscripción: " + subError.message }),
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
        },
        owner: {
          userId: ownerUserId,
          email: input.ownerEmail,
          fullName: input.ownerFullName
        },
        employees: createdEmployees,
        categoriesCreated: categoriesCreatedCount
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
