-- Migración: Normalización de campos JSONB a tablas relacionales
-- ID: DB-008 - 2026-04-19
-- Actualizado: Añadir tenant_id y políticas RLS para seguridad multi-tenant
BEGIN;

-- 1) Crear tablas relacionales para sale_items y sale_payments
CREATE TABLE IF NOT EXISTS public.sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  sale_id uuid NOT NULL,
  product_id uuid,
  product_local_id uuid,
  qty numeric(12,4) NOT NULL,
  unit_price numeric(12,4) NOT NULL,
  unit_cost numeric(12,4),
  tax_amount numeric(12,4),
  discount_amount numeric(12,4),
  is_weighted boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sale_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  sale_id uuid NOT NULL,
  method text NOT NULL,
  currency text NOT NULL,
  amount numeric(12,4) NOT NULL,
  reference text,
  created_at timestamptz DEFAULT now()
);

-- 2) Crear tablas para purchases/receivings/invoices similar
CREATE TABLE IF NOT EXISTS public.purchase_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  purchase_id uuid NOT NULL,
  product_local_id uuid,
  qty numeric(12,4) NOT NULL,
  unit_cost numeric(12,4) NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.purchase_received_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  purchase_id uuid NOT NULL,
  product_local_id uuid,
  qty_received numeric(12,4) NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.receiving_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  receiving_id uuid NOT NULL,
  product_local_id uuid,
  qty numeric(12,4) NOT NULL,
  unit_cost numeric(12,4) NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.receiving_received_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  receiving_id uuid NOT NULL,
  product_local_id uuid,
  qty_received numeric(12,4) NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  invoice_id uuid NOT NULL,
  product_local_id uuid,
  description text,
  qty numeric(12,4) NOT NULL,
  unit_price numeric(12,4) NOT NULL,
  tax_rate numeric(5,2),
  tax_amount numeric(12,4),
  subtotal numeric(12,4),
  discount_percent numeric(5,2),
  discount_amount numeric(12,4),
  is_weighted boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invoice_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  invoice_id uuid NOT NULL,
  method text NOT NULL,
  currency text NOT NULL,
  amount numeric(12,4) NOT NULL,
  reference text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  recipe_id uuid NOT NULL,
  product_local_id uuid,
  required_qty numeric(12,4) NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.production_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  production_log_id uuid NOT NULL,
  product_local_id uuid,
  qty_planned numeric(12,4),
  qty_used numeric(12,4),
  cost_per_unit numeric(12,4),
  created_at timestamptz DEFAULT now()
);

-- 3) Migrar datos: extraer arrays JSONB y volcar en tablas nuevas (incluyendo tenant_id)
-- Sales items
INSERT INTO public.sale_items (tenant_id, sale_id, product_local_id, qty, unit_price, unit_cost, tax_amount, discount_amount, is_weighted, created_at)
SELECT s.tenant_id,
       s.id as sale_id,
       (elem->>'productLocalId')::uuid as product_local_id,
       (elem->>'qty')::numeric,
       (elem->>'unitPrice')::numeric,
       (elem->>'unitCost')::numeric,
       (elem->>'taxAmount')::numeric,
       (elem->>'discountAmount')::numeric,
       (elem->>'isWeighted')::boolean,
       s.created_at
FROM public.sales s,
     lateral jsonb_array_elements(s.items) as elem
WHERE s.items IS NOT NULL;

-- Sales payments
INSERT INTO public.sale_payments (tenant_id, sale_id, method, currency, amount, reference, created_at)
SELECT s.tenant_id,
       s.id as sale_id,
       (p->>'method')::text,
       (p->>'currency')::text,
       (p->>'amount')::numeric,
       (p->>'reference')::text,
       s.created_at
FROM public.sales s,
     lateral jsonb_array_elements(s.payments) as p
WHERE s.payments IS NOT NULL;

-- Purchases items
INSERT INTO public.purchase_items (tenant_id, purchase_id, product_local_id, qty, unit_cost, created_at)
SELECT p.tenant_id,
       p.id as purchase_id,
       (elem->>'productLocalId')::uuid,
       (elem->>'qty')::numeric,
       (elem->>'unitCost')::numeric,
       p.created_at
FROM public.purchases p,
     lateral jsonb_array_elements(p.items) as elem
WHERE p.items IS NOT NULL;

-- Purchases received items
INSERT INTO public.purchase_received_items (tenant_id, purchase_id, product_local_id, qty_received, created_at)
SELECT p.tenant_id,
       p.id as purchase_id,
       (elem->>'productLocalId')::uuid,
       (elem->>'qtyReceived')::numeric,
       p.created_at
FROM public.purchases p,
     lateral jsonb_array_elements(p.received_items) as elem
WHERE p.received_items IS NOT NULL;

-- Receivings items
INSERT INTO public.receiving_items (tenant_id, receiving_id, product_local_id, qty, unit_cost, created_at)
SELECT rcv.tenant_id,
       rcv.id as receiving_id,
       (elem->>'productLocalId')::uuid,
       (elem->>'qty')::numeric,
       (elem->>'unitCost')::numeric,
       rcv.created_at
FROM public.receivings rcv,
     lateral jsonb_array_elements(rcv.items) as elem
WHERE rcv.items IS NOT NULL;

-- Receivings received items
INSERT INTO public.receiving_received_items (tenant_id, receiving_id, product_local_id, qty_received, created_at)
SELECT rcv.tenant_id,
       rcv.id as receiving_id,
       (elem->>'productLocalId')::uuid,
       (elem->>'qtyReceived')::numeric,
       rcv.created_at
FROM public.receivings rcv,
     lateral jsonb_array_elements(rcv.received_items) as elem
WHERE rcv.received_items IS NOT NULL;

-- Invoices items
INSERT INTO public.invoice_items (tenant_id, invoice_id, product_local_id, description, qty, unit_price, tax_rate, tax_amount, subtotal, discount_percent, discount_amount, is_weighted, created_at)
SELECT inv.tenant_id,
       inv.id as invoice_id,
       (elem->>'productLocalId')::uuid,
       (elem->>'description')::text,
       (elem->>'qty')::numeric,
       (elem->>'unitPrice')::numeric,
       (elem->>'taxRate')::numeric,
       (elem->>'taxAmount')::numeric,
       (elem->>'subtotal')::numeric,
       (elem->>'discountPercent')::numeric,
       (elem->>'discountAmount')::numeric,
       (elem->>'isWeighted')::boolean,
       inv.created_at
FROM public.invoices inv,
     lateral jsonb_array_elements(inv.items) as elem
WHERE inv.items IS NOT NULL;

-- Invoices payments
INSERT INTO public.invoice_payments (tenant_id, invoice_id, method, currency, amount, reference, created_at)
SELECT inv.tenant_id,
       inv.id as invoice_id,
       (p->>'method')::text,
       (p->>'currency')::text,
       (p->>'amount')::numeric,
       (p->>'reference')::text,
       inv.created_at
FROM public.invoices inv,
     lateral jsonb_array_elements(inv.payments) as p
WHERE inv.payments IS NOT NULL;

-- Recipes ingredients
INSERT INTO public.recipe_ingredients (tenant_id, recipe_id, product_local_id, required_qty, created_at)
SELECT r.tenant_id,
       r.id as recipe_id,
       (elem->>'productLocalId')::uuid,
       (elem->>'requiredQty')::numeric,
       r.created_at
FROM public.recipes r,
     lateral jsonb_array_elements(r.ingredients) as elem
WHERE r.ingredients IS NOT NULL;

-- Production ingredients
INSERT INTO public.production_ingredients (tenant_id, production_log_id, product_local_id, qty_planned, qty_used, cost_per_unit, created_at)
SELECT pl.tenant_id,
       pl.id as production_log_id,
       (elem->>'productLocalId')::uuid,
       (elem->>'qtyPlanned')::numeric,
       (elem->>'qtyUsed')::numeric,
       (elem->>'costPerUnit')::numeric,
       pl.created_at
FROM public.production_logs pl,
     lateral jsonb_array_elements(pl.ingredients_used) as elem
WHERE pl.ingredients_used IS NOT NULL;

-- 4) Ajuste tenants.taxpayer_info
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS tax_rif text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS tax_razon_social text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS tax_direccion_fiscal text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS tax_regimen text;

UPDATE public.tenants t
SET tax_rif = (t.taxpayer_info->>'rif'),
    tax_razon_social = (t.taxpayer_info->>'razonSocial'),
    tax_direccion_fiscal = (t.taxpayer_info->>'direccionFiscal'),
    tax_regimen = (t.taxpayer_info->>'regimen')
WHERE t.taxpayer_info IS NOT NULL;

-- 5) Validaciones: contar elementos migrados (ejemplos)
-- (Estas queries no alteran datos, son para verificación manual)
-- SELECT count(*) FROM public.sale_items;
-- SELECT sum(jsonb_array_length(items)) FROM public.sales;

-- 6) Índices para tenant_id en tablas normalizadas (rendimiento y RLS)
CREATE INDEX IF NOT EXISTS idx_sale_items_tenant_id ON public.sale_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sale_payments_tenant_id ON public.sale_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_tenant_id ON public.purchase_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_received_items_tenant_id ON public.purchase_received_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_receiving_items_tenant_id ON public.receiving_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_receiving_received_items_tenant_id ON public.receiving_received_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_tenant_id ON public.invoice_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_tenant_id ON public.invoice_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_tenant_id ON public.recipe_ingredients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_production_ingredients_tenant_id ON public.production_ingredients(tenant_id);

-- 7) Políticas RLS para tablas normalizadas (aislamiento multi-tenant)

-- sale_items: Tenant isolation + active session
CREATE POLICY "sale_items_select" ON public.sale_items
  FOR SELECT
  USING (((tenant_id = (SELECT get_auth_tenant_id())) AND (SELECT is_auth_active())) OR (SELECT get_auth_role()) = 'admin');

CREATE POLICY "sale_items_insert" ON public.sale_items
  FOR INSERT
  WITH CHECK (((tenant_id = (SELECT get_auth_tenant_id())) AND (SELECT is_auth_active())) OR (SELECT get_auth_role()) = 'admin');

-- sale_payments: Tenant isolation + active session
CREATE POLICY "sale_payments_select" ON public.sale_payments
  FOR SELECT
  USING (((tenant_id = (SELECT get_auth_tenant_id())) AND (SELECT is_auth_active())) OR (SELECT get_auth_role()) = 'admin');

CREATE POLICY "sale_payments_insert" ON public.sale_payments
  FOR INSERT
  WITH CHECK (((tenant_id = (SELECT get_auth_tenant_id())) AND (SELECT is_auth_active())) OR (SELECT get_auth_role()) = 'admin');

-- purchase_items: Tenant isolation
CREATE POLICY "purchase_items_select" ON public.purchase_items
  FOR SELECT
  USING (((tenant_id = (SELECT get_auth_tenant_id())) AND (SELECT is_auth_active())) OR (SELECT get_auth_role()) = 'admin');

CREATE POLICY "purchase_items_insert" ON public.purchase_items
  FOR INSERT
  WITH CHECK (((tenant_id = (SELECT get_auth_tenant_id())) AND (SELECT is_auth_active())) OR (SELECT get_auth_role()) = 'admin');

-- purchase_received_items: Tenant isolation
CREATE POLICY "purchase_received_items_select" ON public.purchase_received_items
  FOR SELECT
  USING (((tenant_id = (SELECT get_auth_tenant_id())) AND (SELECT is_auth_active())) OR (SELECT get_auth_role()) = 'admin');

CREATE POLICY "purchase_received_items_insert" ON public.purchase_received_items
  FOR INSERT
  WITH CHECK (((tenant_id = (SELECT get_auth_tenant_id())) AND (SELECT is_auth_active())) OR (SELECT get_auth_role()) = 'admin');

-- receiving_items: Tenant isolation
CREATE POLICY "receiving_items_select" ON public.receiving_items
  FOR SELECT
  USING (((tenant_id = (SELECT get_auth_tenant_id())) AND (SELECT is_auth_active())) OR (SELECT get_auth_role()) = 'admin');

CREATE POLICY "receiving_items_insert" ON public.receiving_items
  FOR INSERT
  WITH CHECK (((tenant_id = (SELECT get_auth_tenant_id())) AND (SELECT is_auth_active())) OR (SELECT get_auth_role()) = 'admin');

-- receiving_received_items: Tenant isolation
CREATE POLICY "receiving_received_items_select" ON public.receiving_received_items
  FOR SELECT
  USING (((tenant_id = (SELECT get_auth_tenant_id())) AND (SELECT is_auth_active())) OR (SELECT get_auth_role()) = 'admin');

CREATE POLICY "receiving_received_items_insert" ON public.receiving_received_items
  FOR INSERT
  WITH CHECK (((tenant_id = (SELECT get_auth_tenant_id())) AND (SELECT is_auth_active())) OR (SELECT get_auth_role()) = 'admin');

-- invoice_items: Tenant isolation
CREATE POLICY "invoice_items_select" ON public.invoice_items
  FOR SELECT
  USING (((tenant_id = (SELECT get_auth_tenant_id())) AND (SELECT is_auth_active())) OR (SELECT get_auth_role()) = 'admin');

CREATE POLICY "invoice_items_insert" ON public.invoice_items
  FOR INSERT
  WITH CHECK (((tenant_id = (SELECT get_auth_tenant_id())) AND (SELECT is_auth_active())) OR (SELECT get_auth_role()) = 'admin');

-- invoice_payments: Tenant isolation
CREATE POLICY "invoice_payments_select" ON public.invoice_payments
  FOR SELECT
  USING (((tenant_id = (SELECT get_auth_tenant_id())) AND (SELECT is_auth_active())) OR (SELECT get_auth_role()) = 'admin');

CREATE POLICY "invoice_payments_insert" ON public.invoice_payments
  FOR INSERT
  WITH CHECK (((tenant_id = (SELECT get_auth_tenant_id())) AND (SELECT is_auth_active())) OR (SELECT get_auth_role()) = 'admin');

-- recipe_ingredients: Tenant isolation
CREATE POLICY "recipe_ingredients_select" ON public.recipe_ingredients
  FOR SELECT
  USING (((tenant_id = (SELECT get_auth_tenant_id())) AND (SELECT is_auth_active())) OR (SELECT get_auth_role()) = 'admin');

CREATE POLICY "recipe_ingredients_insert" ON public.recipe_ingredients
  FOR INSERT
  WITH CHECK (((tenant_id = (SELECT get_auth_tenant_id())) AND (SELECT is_auth_active())) OR (SELECT get_auth_role()) = 'admin');

-- production_ingredients: Tenant isolation
CREATE POLICY "production_ingredients_select" ON public.production_ingredients
  FOR SELECT
  USING (((tenant_id = (SELECT get_auth_tenant_id())) AND (SELECT is_auth_active())) OR (SELECT get_auth_role()) = 'admin');

CREATE POLICY "production_ingredients_insert" ON public.production_ingredients
  FOR INSERT
  WITH CHECK (((tenant_id = (SELECT get_auth_tenant_id())) AND (SELECT is_auth_active())) OR (SELECT get_auth_role()) = 'admin');

COMMIT;
