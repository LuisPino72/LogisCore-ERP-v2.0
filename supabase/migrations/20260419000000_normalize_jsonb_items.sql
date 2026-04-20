-- Migración: Normalización de campos JSONB a tablas relacionales
-- ID: DB-008 - 2026-04-19
BEGIN;

-- 1) Crear tablas relacionales para sale_items y sale_payments
CREATE TABLE IF NOT EXISTS public.sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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
  purchase_id uuid NOT NULL,
  product_local_id uuid,
  qty numeric(12,4) NOT NULL,
  unit_cost numeric(12,4) NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.purchase_received_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL,
  product_local_id uuid,
  qty_received numeric(12,4) NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.receiving_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receiving_id uuid NOT NULL,
  product_local_id uuid,
  qty numeric(12,4) NOT NULL,
  unit_cost numeric(12,4) NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.receiving_received_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receiving_id uuid NOT NULL,
  product_local_id uuid,
  qty_received numeric(12,4) NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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
  invoice_id uuid NOT NULL,
  method text NOT NULL,
  currency text NOT NULL,
  amount numeric(12,4) NOT NULL,
  reference text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL,
  product_local_id uuid,
  required_qty numeric(12,4) NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.production_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_log_id uuid NOT NULL,
  product_local_id uuid,
  qty_planned numeric(12,4),
  qty_used numeric(12,4),
  cost_per_unit numeric(12,4),
  created_at timestamptz DEFAULT now()
);

-- 3) Migrar datos: extraer arrays JSONB y volcar en tablas nuevas
-- Sales items
INSERT INTO public.sale_items (sale_id, product_local_id, qty, unit_price, unit_cost, tax_amount, discount_amount, is_weighted, created_at)
SELECT s.id as sale_id,
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
INSERT INTO public.sale_payments (sale_id, method, currency, amount, reference, created_at)
SELECT s.id as sale_id,
       (p->>'method')::text,
       (p->>'currency')::text,
       (p->>'amount')::numeric,
       (p->>'reference')::text,
       s.created_at
FROM public.sales s,
     lateral jsonb_array_elements(s.payments) as p
WHERE s.payments IS NOT NULL;

-- Purchases items
INSERT INTO public.purchase_items (purchase_id, product_local_id, qty, unit_cost, created_at)
SELECT p.id as purchase_id,
       (elem->>'productLocalId')::uuid,
       (elem->>'qty')::numeric,
       (elem->>'unitCost')::numeric,
       p.created_at
FROM public.purchases p,
     lateral jsonb_array_elements(p.items) as elem
WHERE p.items IS NOT NULL;

-- Purchases received items
INSERT INTO public.purchase_received_items (purchase_id, product_local_id, qty_received, created_at)
SELECT p.id as purchase_id,
       (elem->>'productLocalId')::uuid,
       (elem->>'qtyReceived')::numeric,
       p.created_at
FROM public.purchases p,
     lateral jsonb_array_elements(p.received_items) as elem
WHERE p.received_items IS NOT NULL;

-- Receivings items
INSERT INTO public.receiving_items (receiving_id, product_local_id, qty, unit_cost, created_at)
SELECT rcv.id as receiving_id,
       (elem->>'productLocalId')::uuid,
       (elem->>'qty')::numeric,
       (elem->>'unitCost')::numeric,
       rcv.created_at
FROM public.receivings rcv,
     lateral jsonb_array_elements(rcv.items) as elem
WHERE rcv.items IS NOT NULL;

-- Receivings received items
INSERT INTO public.receiving_received_items (receiving_id, product_local_id, qty_received, created_at)
SELECT rcv.id as receiving_id,
       (elem->>'productLocalId')::uuid,
       (elem->>'qtyReceived')::numeric,
       rcv.created_at
FROM public.receivings rcv,
     lateral jsonb_array_elements(rcv.received_items) as elem
WHERE rcv.received_items IS NOT NULL;

-- Invoices items
INSERT INTO public.invoice_items (invoice_id, product_local_id, description, qty, unit_price, tax_rate, tax_amount, subtotal, discount_percent, discount_amount, is_weighted, created_at)
SELECT inv.id as invoice_id,
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
INSERT INTO public.invoice_payments (invoice_id, method, currency, amount, reference, created_at)
SELECT inv.id as invoice_id,
       (p->>'method')::text,
       (p->>'currency')::text,
       (p->>'amount')::numeric,
       (p->>'reference')::text,
       inv.created_at
FROM public.invoices inv,
     lateral jsonb_array_elements(inv.payments) as p
WHERE inv.payments IS NOT NULL;

-- Recipes ingredients
INSERT INTO public.recipe_ingredients (recipe_id, product_local_id, required_qty, created_at)
SELECT r.id as recipe_id,
       (elem->>'productLocalId')::uuid,
       (elem->>'requiredQty')::numeric,
       r.created_at
FROM public.recipes r,
     lateral jsonb_array_elements(r.ingredients) as elem
WHERE r.ingredients IS NOT NULL;

-- Production ingredients
INSERT INTO public.production_ingredients (production_log_id, product_local_id, qty_planned, qty_used, cost_per_unit, created_at)
SELECT pl.id as production_log_id,
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

COMMIT;
