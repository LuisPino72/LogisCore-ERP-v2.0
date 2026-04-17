import { createClient } from "jsr:@supabase/supabase-js@2.49.1";
import { createRbacMiddleware } from "../_shared/rbac-middleware";

interface GlobalProductSeed {
  name: string;
  category: string;
  sku: string;
  visible: boolean;
  is_weighted: boolean;
  unit_of_measure: string;
  presentation: { name: string; factor: number };
}

const GLOBAL_PRODUCTS_BY_BUSINESS: Record<string, GlobalProductSeed[]> = {
  Bodega: [
    { name: "Tomate", category: "Frutas y Verduras", sku: "TOM-001", visible: true, is_weighted: true, unit_of_measure: "kg", presentation: { name: "Unidad", factor: 1 } },
    { name: "Cebolla", category: "Frutas y Verduras", sku: "CEB-001", visible: true, is_weighted: true, unit_of_measure: "kg", presentation: { name: "Unidad", factor: 1 } },
    { name: "Arroz", category: "Víveres", sku: "ARR-001", visible: true, is_weighted: false, unit_of_measure: "unidad", presentation: { name: "Kilo", factor: 1 } },
    { name: "Harina", category: "Víveres", sku: "HAR-001", visible: true, is_weighted: false, unit_of_measure: "unidad", presentation: { name: "Kilo", factor: 1 } },
    { name: "Aceite", category: "Enlatados", sku: "ACE-001", visible: true, is_weighted: false, unit_of_measure: "unidad", presentation: { name: "Litro", factor: 1 } },
    { name: "Azúcar", category: "Víveres", sku: "AZU-001", visible: true, is_weighted: false, unit_of_measure: "unidad", presentation: { name: "Kilo", factor: 1 } },
    { name: "Sal", category: "Condimentos", sku: "SAL-001", visible: true, is_weighted: false, unit_of_measure: "unidad", presentation: { name: "Kilo", factor: 1 } },
    { name: "Pasta", category: "Pastas", sku: "PAS-001", visible: true, is_weighted: false, unit_of_measure: "unidad", presentation: { name: "Paquete", factor: 1 } },
    { name: "Leche", category: "Lácteos", sku: "LEC-001", visible: true, is_weighted: false, unit_of_measure: "unidad", presentation: { name: "Litro", factor: 1 } },
    { name: "Huevos", category: "Lácteos", sku: "HUE-001", visible: true, is_weighted: false, unit_of_measure: "unidad", presentation: { name: "Docena", factor: 12 } }
  ],
  Restaurante: [
    { name: "Aceite", category: "Insumos", sku: "ACE-RES-001", visible: true, is_weighted: false, unit_of_measure: "unidad", presentation: { name: "Litro", factor: 1 } },
    { name: "Harina", category: "Insumos", sku: "HAR-RES-001", visible: true, is_weighted: false, unit_of_measure: "unidad", presentation: { name: "Kilo", factor: 1 } },
    { name: "Tomate", category: "Insumos", sku: "TOM-RES-001", visible: true, is_weighted: true, unit_of_measure: "kg", presentation: { name: "Kilo", factor: 1 } },
    { name: "Cebolla", category: "Insumos", sku: "CEB-RES-001", visible: true, is_weighted: true, unit_of_measure: "kg", presentation: { name: "Kilo", factor: 1 } },
    { name: "Pollo", category: "Proteínas", sku: "POL-RES-001", visible: true, is_weighted: true, unit_of_measure: "kg", presentation: { name: "Kilo", factor: 1 } },
    { name: "Arroz", category: "Insumos", sku: "ARR-RES-001", visible: true, is_weighted: false, unit_of_measure: "unidad", presentation: { name: "Kilo", factor: 1 } }
  ],
  Manufactura: [
    { name: "Materia Prima A", category: "Materia Prima", sku: "MP-A-001", visible: true, is_weighted: true, unit_of_measure: "kg", presentation: { name: "Kilo", factor: 1 } },
    { name: "Materia Prima B", category: "Materia Prima", sku: "MP-B-001", visible: true, is_weighted: false, unit_of_measure: "unidad", presentation: { name: "Unidad", factor: 1 } },
    { name: "Insumo General", category: "Insumos", sku: "INS-001", visible: true, is_weighted: false, unit_of_measure: "unidad", presentation: { name: "Unidad", factor: 1 } }
  ],
  Servicios: [],
  Otro: [
    { name: "Producto Genérico", category: "General", sku: "GEN-001", visible: true, is_weighted: false, unit_of_measure: "unidad", presentation: { name: "Unidad", factor: 1 } }
  ]
};

const DEFAULT_CATEGORIES_BY_BUSINESS: Record<string, string[]> = {
  Bodega: ["Frutas y Verduras", "Víveres", "Lácteos", "Enlatados", "Condimentos", "Pastas", "Bebidas", "Limpieza"],
  Restaurante: ["Insumos", "Proteínas", "Bebidas", "Limpieza", "Empaques"],
  Manufactura: ["Materia Prima", "Insumos", "Productos Terminados", "Empaques", "Limpieza"],
  Servicios: ["Insumos", "Herramientas", "Repuestos", "Limpieza"],
 Otro: ["General", "Varios"]
};

const jsonHeaders = {
  "Content-Type": "application/json",
      "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "https://logiscore-erp.vercel.app",
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
    const { data: roleRow, error: roleError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("user_id", authResult.data.user.id)
      .eq("role", "admin")
      .eq("is_active", true)
      .maybeSingle();

    if (roleError || !roleRow) {
      return new Response(
        JSON.stringify({ success: false, error: "FORBIDDEN_ADMIN_ONLY" }),
        { status: 403, headers: jsonHeaders }
      );
    }

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
        is_active: true,
        permissions: emp.permissions || []
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

    let categoriesCreatedCount = 0;
    let productsCreated = 0;
    let presentationsCreated = 0;

    if (input.businessTypeId) {
      const { data: businessType } = await supabase
        .from("business_types")
        .select("name")
        .eq("id", input.businessTypeId)
        .maybeSingle<{ name: string }>();

      const businessName = businessType?.name ?? "Otro";
      const defaultCategories = DEFAULT_CATEGORIES_BY_BUSINESS[businessName] ?? DEFAULT_CATEGORIES_BY_BUSINESS["Otro"];
      const categoryMap = new Map<string, string>();
      const now = new Date().toISOString();

      for (const catName of defaultCategories) {
        const catLocalId = crypto.randomUUID();
        const { error: catError } = await supabase.from("categories").insert({
          local_id: catLocalId,
          tenant_id: tenantId,
          tenant_slug: input.slug,
          name: catName,
          created_at: now,
          updated_at: now,
          business_type_id: input.businessTypeId,
          is_global: false
        });

        if (!catError) {
          categoriesCreatedCount++;
          categoryMap.set(catName.toLowerCase(), catLocalId);
        }
      }

      const seedProducts = GLOBAL_PRODUCTS_BY_BUSINESS[businessName] ?? [];

      if (seedProducts.length > 0) {
        for (const sp of seedProducts) {
          const categoryId = categoryMap.get(sp.category.toLowerCase()) ?? null;
          const productLocalId = crypto.randomUUID();

          const { error: prodError } = await supabase.from("products").insert({
            local_id: productLocalId,
            tenant_id: tenantId,
            tenant_slug: input.slug,
            name: sp.name,
            sku: sp.sku,
            visible: sp.visible,
            is_weighted: sp.is_weighted,
            unit_of_measure: sp.unit_of_measure,
            category_id: categoryId,
            is_serialized: false,
            is_taxable: true,
            created_at: now,
            updated_at: now
          });

          if (!prodError) {
            productsCreated++;

            const { error: presError } = await supabase.from("product_presentations").insert({
              tenant_id: tenantId,
              tenant_slug: input.slug,
              product_local_id: productLocalId,
              name: sp.presentation.name,
              factor: sp.presentation.factor,
              is_default: true,
              created_at: now,
              updated_at: now
            });

            if (!presError) {
              presentationsCreated++;
            }
          }
        }
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
        categoriesCreated: categoriesCreatedCount,
        productsCreated,
        presentationsCreated
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
