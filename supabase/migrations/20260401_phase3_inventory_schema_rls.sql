BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  local_id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  name text NOT NULL,
  code text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.product_size_colors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  local_id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  product_local_id uuid NOT NULL,
  size text,
  color text,
  sku_suffix text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  local_id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  product_local_id uuid NOT NULL,
  warehouse_local_id uuid NOT NULL,
  movement_type text NOT NULL CHECK (
    movement_type IN (
      'purchase_in',
      'sale_out',
      'adjustment_in',
      'adjustment_out',
      'production_in',
      'production_out',
      'transfer_in',
      'transfer_out',
      'count_adjustment'
    )
  ),
  quantity numeric(19,4) NOT NULL CHECK (quantity <> 0),
  unit_cost numeric(19,4),
  reference_type text,
  reference_local_id uuid,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.inventory_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  local_id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  warehouse_local_id uuid NOT NULL,
  product_local_id uuid NOT NULL,
  expected_qty numeric(19,4) NOT NULL DEFAULT 0,
  counted_qty numeric(19,4) NOT NULL DEFAULT 0,
  difference_qty numeric(19,4) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted', 'voided')),
  reason text,
  counted_by uuid REFERENCES auth.users(id),
  counted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_warehouses_tenant_local_id
  ON public.warehouses(tenant_id, local_id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_product_size_colors_tenant_local_id
  ON public.product_size_colors(tenant_id, local_id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_stock_movements_tenant_local_id
  ON public.stock_movements(tenant_id, local_id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_inventory_counts_tenant_local_id
  ON public.inventory_counts(tenant_id, local_id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_warehouses_tenant_code
  ON public.warehouses(tenant_id, code)
  WHERE code IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_warehouses_tenant_id
  ON public.warehouses(tenant_id);

CREATE INDEX IF NOT EXISTS idx_warehouses_created_at
  ON public.warehouses(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_warehouses_tenant_created
  ON public.warehouses(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_size_colors_tenant_id
  ON public.product_size_colors(tenant_id);

CREATE INDEX IF NOT EXISTS idx_product_size_colors_created_at
  ON public.product_size_colors(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_size_colors_tenant_created
  ON public.product_size_colors(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stock_movements_tenant_id
  ON public.stock_movements(tenant_id);

CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at
  ON public.stock_movements(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stock_movements_tenant_created
  ON public.stock_movements(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stock_movements_tenant_product_warehouse
  ON public.stock_movements(tenant_id, product_local_id, warehouse_local_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_counts_tenant_id
  ON public.inventory_counts(tenant_id);

CREATE INDEX IF NOT EXISTS idx_inventory_counts_created_at
  ON public.inventory_counts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_counts_tenant_created
  ON public.inventory_counts(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_counts_tenant_product_warehouse
  ON public.inventory_counts(tenant_id, product_local_id, warehouse_local_id, created_at DESC);

ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses FORCE ROW LEVEL SECURITY;

ALTER TABLE public.product_size_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_size_colors FORCE ROW LEVEL SECURITY;

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements FORCE ROW LEVEL SECURITY;

ALTER TABLE public.inventory_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_counts FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios ven solo su tenant warehouses" ON public.warehouses;
DROP POLICY IF EXISTS "Usuarios crean warehouses en su tenant" ON public.warehouses;
DROP POLICY IF EXISTS "Usuarios actualizan warehouses en su tenant" ON public.warehouses;

CREATE POLICY "Usuarios ven solo su tenant warehouses"
ON public.warehouses FOR SELECT
USING (
  tenant_id = (
    SELECT id
    FROM public.tenants
    WHERE slug = current_setting('request.jwt.claim.tenant_slug', true)
  )
);

CREATE POLICY "Usuarios crean warehouses en su tenant"
ON public.warehouses FOR INSERT
WITH CHECK (
  tenant_id = (
    SELECT id
    FROM public.tenants
    WHERE slug = current_setting('request.jwt.claim.tenant_slug', true)
  )
);

CREATE POLICY "Usuarios actualizan warehouses en su tenant"
ON public.warehouses FOR UPDATE
USING (
  tenant_id = (
    SELECT id
    FROM public.tenants
    WHERE slug = current_setting('request.jwt.claim.tenant_slug', true)
  )
)
WITH CHECK (
  tenant_id = (
    SELECT id
    FROM public.tenants
    WHERE slug = current_setting('request.jwt.claim.tenant_slug', true)
  )
);

DROP POLICY IF EXISTS "Usuarios ven solo su tenant product_size_colors" ON public.product_size_colors;
DROP POLICY IF EXISTS "Usuarios crean product_size_colors en su tenant" ON public.product_size_colors;
DROP POLICY IF EXISTS "Usuarios actualizan product_size_colors en su tenant" ON public.product_size_colors;

CREATE POLICY "Usuarios ven solo su tenant product_size_colors"
ON public.product_size_colors FOR SELECT
USING (
  tenant_id = (
    SELECT id
    FROM public.tenants
    WHERE slug = current_setting('request.jwt.claim.tenant_slug', true)
  )
);

CREATE POLICY "Usuarios crean product_size_colors en su tenant"
ON public.product_size_colors FOR INSERT
WITH CHECK (
  tenant_id = (
    SELECT id
    FROM public.tenants
    WHERE slug = current_setting('request.jwt.claim.tenant_slug', true)
  )
);

CREATE POLICY "Usuarios actualizan product_size_colors en su tenant"
ON public.product_size_colors FOR UPDATE
USING (
  tenant_id = (
    SELECT id
    FROM public.tenants
    WHERE slug = current_setting('request.jwt.claim.tenant_slug', true)
  )
)
WITH CHECK (
  tenant_id = (
    SELECT id
    FROM public.tenants
    WHERE slug = current_setting('request.jwt.claim.tenant_slug', true)
  )
);

DROP POLICY IF EXISTS "Usuarios ven solo su tenant stock_movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Usuarios crean stock_movements en su tenant" ON public.stock_movements;

CREATE POLICY "Usuarios ven solo su tenant stock_movements"
ON public.stock_movements FOR SELECT
USING (
  tenant_id = (
    SELECT id
    FROM public.tenants
    WHERE slug = current_setting('request.jwt.claim.tenant_slug', true)
  )
);

CREATE POLICY "Usuarios crean stock_movements en su tenant"
ON public.stock_movements FOR INSERT
WITH CHECK (
  tenant_id = (
    SELECT id
    FROM public.tenants
    WHERE slug = current_setting('request.jwt.claim.tenant_slug', true)
  )
);

DROP POLICY IF EXISTS "Usuarios ven solo su tenant inventory_counts" ON public.inventory_counts;
DROP POLICY IF EXISTS "Usuarios crean inventory_counts en su tenant" ON public.inventory_counts;
DROP POLICY IF EXISTS "Usuarios actualizan inventory_counts en su tenant" ON public.inventory_counts;

CREATE POLICY "Usuarios ven solo su tenant inventory_counts"
ON public.inventory_counts FOR SELECT
USING (
  tenant_id = (
    SELECT id
    FROM public.tenants
    WHERE slug = current_setting('request.jwt.claim.tenant_slug', true)
  )
);

CREATE POLICY "Usuarios crean inventory_counts en su tenant"
ON public.inventory_counts FOR INSERT
WITH CHECK (
  tenant_id = (
    SELECT id
    FROM public.tenants
    WHERE slug = current_setting('request.jwt.claim.tenant_slug', true)
  )
);

CREATE POLICY "Usuarios actualizan inventory_counts en su tenant"
ON public.inventory_counts FOR UPDATE
USING (
  tenant_id = (
    SELECT id
    FROM public.tenants
    WHERE slug = current_setting('request.jwt.claim.tenant_slug', true)
  )
)
WITH CHECK (
  tenant_id = (
    SELECT id
    FROM public.tenants
    WHERE slug = current_setting('request.jwt.claim.tenant_slug', true)
  )
);

COMMIT;
