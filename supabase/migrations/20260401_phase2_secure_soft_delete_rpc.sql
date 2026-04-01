BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS local_id uuid,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE public.categories
SET local_id = id
WHERE local_id IS NULL;

ALTER TABLE public.categories
  ALTER COLUMN local_id SET NOT NULL;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS local_id uuid,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE public.products
SET local_id = id
WHERE local_id IS NULL;

ALTER TABLE public.products
  ALTER COLUMN local_id SET NOT NULL;

ALTER TABLE public.product_presentations
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS ux_categories_tenant_local_id
  ON public.categories(tenant_id, local_id);

CREATE UNIQUE INDEX IF NOT EXISTS ux_products_tenant_local_id
  ON public.products(tenant_id, local_id);

CREATE OR REPLACE FUNCTION public.secure_soft_delete_category(p_local_id uuid)
RETURNS TABLE(success boolean, code text, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_tenant_slug text := NULLIF(current_setting('request.jwt.claim.tenant_slug', true), '');
  v_tenant_id uuid;
  v_role text;
  v_permissions jsonb := '{}'::jsonb;
  v_refs bigint := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'UNAUTHENTICATED', 'Sesion invalida.';
    RETURN;
  END IF;

  IF v_tenant_slug IS NULL THEN
    RETURN QUERY SELECT false, 'TENANT_CLAIM_MISSING', 'JWT sin tenant_slug.';
    RETURN;
  END IF;

  SELECT t.id INTO v_tenant_id
  FROM public.tenants t
  WHERE t.slug = v_tenant_slug
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RETURN QUERY SELECT false, 'TENANT_NOT_FOUND', 'Tenant no encontrado por slug.';
    RETURN;
  END IF;

  SELECT r.role, COALESCE(r.permissions, '{}'::jsonb)
  INTO v_role, v_permissions
  FROM public.get_user_primary_role(v_user_id) r
  LIMIT 1;

  IF v_role IS NULL THEN
    RETURN QUERY SELECT false, 'ROLE_NOT_FOUND', 'No se pudo resolver rol.';
    RETURN;
  END IF;

  IF v_role NOT IN ('owner', 'super_admin') THEN
    RETURN QUERY SELECT false, 'PERMISSION_DENIED', 'Operacion sensible requiere owner/super_admin.';
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_refs
  FROM public.products p
  WHERE p.tenant_id = v_tenant_id
    AND p.category_id = p_local_id
    AND p.deleted_at IS NULL;

  IF v_refs > 0 THEN
    RETURN QUERY
    SELECT false, 'CATEGORY_DELETE_BLOCKED_REFERENCES', 'La categoria tiene productos activos.';
    RETURN;
  END IF;

  UPDATE public.categories c
  SET deleted_at = now(),
      updated_at = now()
  WHERE c.tenant_id = v_tenant_id
    AND c.local_id = p_local_id
    AND c.deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'CATEGORY_NOT_FOUND', 'Categoria no encontrada o ya eliminada.';
    RETURN;
  END IF;

  RETURN QUERY SELECT true, 'CATEGORY_SOFT_DELETED', 'Categoria eliminada logicamente.';
END;
$$;

CREATE OR REPLACE FUNCTION public.secure_soft_delete_product(p_local_id uuid)
RETURNS TABLE(success boolean, code text, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_tenant_slug text := NULLIF(current_setting('request.jwt.claim.tenant_slug', true), '');
  v_tenant_id uuid;
  v_role text;
  v_permissions jsonb := '{}'::jsonb;
  v_refs bigint := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'UNAUTHENTICATED', 'Sesion invalida.';
    RETURN;
  END IF;

  IF v_tenant_slug IS NULL THEN
    RETURN QUERY SELECT false, 'TENANT_CLAIM_MISSING', 'JWT sin tenant_slug.';
    RETURN;
  END IF;

  SELECT t.id INTO v_tenant_id
  FROM public.tenants t
  WHERE t.slug = v_tenant_slug
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RETURN QUERY SELECT false, 'TENANT_NOT_FOUND', 'Tenant no encontrado por slug.';
    RETURN;
  END IF;

  SELECT r.role, COALESCE(r.permissions, '{}'::jsonb)
  INTO v_role, v_permissions
  FROM public.get_user_primary_role(v_user_id) r
  LIMIT 1;

  IF v_role IS NULL THEN
    RETURN QUERY SELECT false, 'ROLE_NOT_FOUND', 'No se pudo resolver rol.';
    RETURN;
  END IF;

  IF v_role NOT IN ('owner', 'super_admin') THEN
    RETURN QUERY SELECT false, 'PERMISSION_DENIED', 'Operacion sensible requiere owner/super_admin.';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'product_presentations'
      AND column_name = 'product_local_id'
  ) THEN
    EXECUTE $q$
      SELECT COUNT(*)
      FROM public.product_presentations pp
      WHERE pp.tenant_id = $1
        AND pp.product_local_id = $2
        AND (pp.deleted_at IS NULL)
    $q$
    INTO v_refs
    USING v_tenant_id, p_local_id;
  ELSE
    EXECUTE $q$
      SELECT COUNT(*)
      FROM public.product_presentations pp
      JOIN public.products p
        ON p.id = pp.product_id
      WHERE pp.tenant_id = $1
        AND p.tenant_id = $1
        AND p.local_id = $2
        AND (pp.deleted_at IS NULL)
    $q$
    INTO v_refs
    USING v_tenant_id, p_local_id;
  END IF;

  IF v_refs > 0 THEN
    RETURN QUERY
    SELECT false, 'PRODUCT_DELETE_BLOCKED_REFERENCES', 'El producto tiene presentaciones activas.';
    RETURN;
  END IF;

  UPDATE public.products p
  SET deleted_at = now(),
      updated_at = now()
  WHERE p.tenant_id = v_tenant_id
    AND p.local_id = p_local_id
    AND p.deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'PRODUCT_NOT_FOUND', 'Producto no encontrado o ya eliminado.';
    RETURN;
  END IF;

  RETURN QUERY SELECT true, 'PRODUCT_SOFT_DELETED', 'Producto eliminado logicamente.';
END;
$$;

REVOKE ALL ON FUNCTION public.secure_soft_delete_category(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.secure_soft_delete_product(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.secure_soft_delete_category(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.secure_soft_delete_product(uuid) TO authenticated;

COMMIT;
