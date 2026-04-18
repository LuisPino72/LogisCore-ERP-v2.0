import { Hono } from "jsr:@hono/hono@4.6.1";
import { createClient } from "jsr:@supabase/supabase-js@2.49.1";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const app = new Hono();

const cors = async (c: any, next: any) => {
  if (c.req.method === "OPTIONS") {
    return c.text("ok", 200, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "https://logiscore-erp.vercel.app",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS"
    });
  }
  await next();
};
app.use(cors);

const globalProducts: Record<string, any[]> = {
  Bodega: [
    { name: "Tomate", category: "Frutas y Verduras", sku: "TOM-001", visible: true, isWeighted: true, unit: "kg", presName: "Unidad", presFactor: 1 },
    { name: "Cebolla", category: "Frutas y Verduras", sku: "CEB-001", visible: true, isWeighted: true, unit: "kg", presName: "Unidad", presFactor: 1 },
    { name: "Arroz", category: "Viveres", sku: "ARR-001", visible: true, isWeighted: false, unit: "unidad", presName: "Kilo", presFactor: 1 },
    { name: "Harina", category: "Viveres", sku: "HAR-001", visible: true, isWeighted: false, unit: "unidad", presName: "Kilo", presFactor: 1 },
    { name: "Aceite", category: "Enlatados", sku: "ACE-001", visible: true, isWeighted: false, unit: "unidad", presName: "Litro", presFactor: 1 },
    { name: "Azucar", category: "Viveres", sku: "AZU-001", visible: true, isWeighted: false, unit: "unidad", presName: "Kilo", presFactor: 1 },
    { name: "Sal", category: "Condimentos", sku: "SAL-001", visible: true, isWeighted: false, unit: "unidad", presName: "Kilo", presFactor: 1 },
    { name: "Pasta", category: "Pastas", sku: "PAS-001", visible: true, isWeighted: false, unit: "unidad", presName: "Paquete", presFactor: 1 },
    { name: "Leche", category: "Lacteos", sku: "LEC-001", visible: true, isWeighted: false, unit: "unidad", presName: "Litro", presFactor: 1 },
    { name: "Huevos", category: "Lacteos", sku: "HUE-001", visible: true, isWeighted: false, unit: "unidad", presName: "Docena", presFactor: 12 }
  ],
  Restaurante: [
    { name: "Aceite", category: "Insumos", sku: "ACE-RES-001", visible: true, isWeighted: false, unit: "unidad", presName: "Litro", presFactor: 1 },
    { name: "Harina", category: "Insumos", sku: "HAR-RES-001", visible: true, isWeighted: false, unit: "unidad", presName: "Kilo", presFactor: 1 },
    { name: "Tomate", category: "Insumos", sku: "TOM-RES-001", visible: true, isWeighted: true, unit: "kg", presName: "Kilo", presFactor: 1 },
    { name: "Cebolla", category: "Insumos", sku: "CEB-RES-001", visible: true, isWeighted: true, unit: "kg", presName: "Kilo", presFactor: 1 },
    { name: "Pollo", category: "Proteinas", sku: "POL-RES-001", visible: true, isWeighted: true, unit: "kg", presName: "Kilo", presFactor: 1 },
    { name: "Arroz", category: "Insumos", sku: "ARR-RES-001", visible: true, isWeighted: false, unit: "unidad", presName: "Kilo", presFactor: 1 }
  ],
  Manufactura: [
    { name: "Materia Prima A", category: "Materia Prima", sku: "MP-A-001", visible: true, isWeighted: true, unit: "kg", presName: "Kilo", presFactor: 1 },
    { name: "Materia Prima B", category: "Materia Prima", sku: "MP-B-001", visible: true, isWeighted: false, unit: "unidad", presName: "Unidad", presFactor: 1 },
    { name: "Insumo General", category: "Insumos", sku: "INS-001", visible: true, isWeighted: false, unit: "unidad", presName: "Unidad", presFactor: 1 }
  ],
  Servicios: [],
  Otro: [
    { name: "Producto Generico", category: "General", sku: "GEN-001", visible: true, isWeighted: false, unit: "unidad", presName: "Unidad", presFactor: 1 }
  ]
};

const defaultCategories: Record<string, string[]> = {
  Bodega: ["Frutas y Verduras", "Viveres", "Lacteos", "Enlatados", "Condimentos", "Pastas", "Bebidas", "Limpieza"],
  Restaurante: ["Insumos", "Proteinas", "Bebidas", "Limpieza", "Empaques"],
  Manufactura: ["Materia Prima", "Insumos", "Productos Terminados", "Empaques", "Limpieza"],
  Servicios: ["Insumos", "Herramientas", "Repuestos", "Limpieza"],
  Otro: ["General", "Varios"]
};

const openapi = {
  openapi: "3.0.0",
  info: { title: "admin-create-tenant", version: "2.0.0", description: "Create new tenants" },
  paths: {
    "/": {
      post: {
        summary: "Create tenant",
        requestBody: {
          content: { "application/json": {
            schema: {
              type: "object",
              required: ["name", "slug", "ownerEmail", "ownerPassword", "ownerFullName", "planId"],
              properties: {
                name: { type: "string" },
                slug: { type: "string" },
                ownerEmail: { type: "string" },
                ownerPassword: { type: "string" },
                ownerFullName: { type: "string" },
                planId: { type: "string" }
              }
            }
          }
        },
        responses: {
          "200": { description: "OK" },
          "400": { description: "Error" },
          "403": { description: "Forbidden" }
        }
      }
    }
  }
};

app.post("/", async (c) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  try {
    const authHeader = c.req.raw.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return c.json({ success: false, error: "UNAUTHORIZED" }, 403);
    }
    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return c.json({ success: false, error: "INVALID_TOKEN" }, 403);
    }
    const { data: roleRow } = await supabase.from("user_roles").select("user_id").eq("user_id", user.id).eq("role", "admin").eq("is_active", true).maybeSingle();
    if (!roleRow) {
      return c.json({ success: false, error: "FORBIDDEN_ADMIN_ONLY" }, 403);
    }
    let input: any;
    try { input = await c.req.json(); } catch {
      return c.json({ success: false, error: "Invalid JSON body" }, 400);
    }
    const required = ["name", "slug", "ownerEmail", "ownerPassword", "ownerFullName", "planId"];
    const missing = required.filter(f => !input[f]);
    if (missing.length > 0) {
      return c.json({ success: false, error: "Faltan campos: " + missing.join(", ") }, 400);
    }
    const { data: authData, error: createUserError } = await supabase.auth.admin.createUser({
      email: input.ownerEmail,
      password: input.ownerPassword,
      email_confirm: true,
      user_metadata: { full_name: input.ownerFullName }
    });
    if (createUserError || !authData.user) {
      return c.json({ success: false, error: createUserError?.message ?? "Error al crear usuario" }, 400);
    }
    const ownerUserId = authData.user.id;
    const { data: tenantData, error: tenantError } = await supabase.from("tenants").insert({
      name: input.name,
      slug: input.slug,
      owner_user_id: ownerUserId,
      contact_email: input.contactEmail || null,
      phone: input.phone || null,
      address: input.address || null,
      business_type_id: input.businessTypeId || null,
      is_active: true
    }).select().single();
    if (tenantError || !tenantData) {
      await supabase.auth.admin.deleteUser(ownerUserId);
      return c.json({ success: false, error: tenantError?.message ?? "Error al crear tenant" }, 400);
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
      const { data: businessType } = await supabase.from("business_types").select("name").eq("id", input.businessTypeId).maybeSingle();
      const businessName = businessType?.name ?? "Otro";
      const cats = defaultCategories[businessName] ?? defaultCategories["Otro"];
      const categoryMap = new Map<string, string>();
      const now = new Date().toISOString();
      for (const catName of cats) {
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
      const seedProducts = globalProducts[businessName] ?? [];
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
          is_weighted: sp.isWeighted,
          unit_of_measure: sp.unit,
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
            name: sp.presName,
            factor: sp.presFactor,
            is_default: true,
            created_at: now,
            updated_at: now
          });
          if (!presError) presentationsCreated++;
        }
      }
    }
    const trialDays = input.trialDays || 0;
    const isTrial = trialDays > 0;
    const daysToAdd = isTrial ? trialDays : 30;
    await supabase.from("subscriptions").insert({
      tenant_id: tenantId,
      plan_id: input.planId,
      status: isTrial ? "trial" : "active",
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000).toISOString(),
      billing_cycle: "monthly",
      trial_days: trialDays
    });
    return c.json({
      success: true,
      tenant: { id: tenantData.id, name: tenantData.name, slug: tenantData.slug },
      owner: { userId: ownerUserId, email: input.ownerEmail, fullName: input.ownerFullName },
      categoriesCreated: categoriesCreatedCount,
      productsCreated,
      presentationsCreated
    });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

app.doc("/openapi.json", openapi);
export default app;