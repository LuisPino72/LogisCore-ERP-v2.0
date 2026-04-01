BEGIN;

CREATE OR REPLACE FUNCTION public.get_stock_balance(
  p_product_local_id uuid,
  p_warehouse_local_id uuid DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_slug text := NULLIF(current_setting('request.jwt.claim.tenant_slug', true), '');
  v_tenant_id uuid;
  v_balance numeric(19,4);
BEGIN
  IF v_tenant_slug IS NULL THEN
    RAISE EXCEPTION 'TENANT_CLAIM_MISSING';
  END IF;

  SELECT t.id INTO v_tenant_id
  FROM public.tenants t
  WHERE t.slug = v_tenant_slug
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'TENANT_NOT_FOUND';
  END IF;

  SELECT COALESCE(SUM(
    CASE sm.movement_type
      WHEN 'purchase_in' THEN sm.quantity
      WHEN 'adjustment_in' THEN sm.quantity
      WHEN 'production_in' THEN sm.quantity
      WHEN 'transfer_in' THEN sm.quantity
      WHEN 'count_adjustment' THEN sm.quantity
      WHEN 'sale_out' THEN -sm.quantity
      WHEN 'adjustment_out' THEN -sm.quantity
      WHEN 'production_out' THEN -sm.quantity
      WHEN 'transfer_out' THEN -sm.quantity
      ELSE 0
    END
  ), 0)
  INTO v_balance
  FROM public.stock_movements sm
  WHERE sm.tenant_id = v_tenant_id
    AND sm.product_local_id = p_product_local_id
    AND sm.deleted_at IS NULL
    AND (p_warehouse_local_id IS NULL OR sm.warehouse_local_id = p_warehouse_local_id);

  RETURN v_balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_stock_movement(
  p_product_local_id uuid,
  p_warehouse_local_id uuid,
  p_movement_type text,
  p_quantity numeric(19,4),
  p_unit_cost numeric(19,4) DEFAULT NULL,
  p_reference_type text DEFAULT NULL,
  p_reference_local_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_local_id uuid DEFAULT gen_random_uuid()
)
RETURNS TABLE(success boolean, code text, message text, movement_local_id uuid)
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
  v_sign integer;
  v_current_balance numeric(19,4);
  v_resulting_balance numeric(19,4);
BEGIN
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'UNAUTHENTICATED', 'Sesion invalida.', NULL::uuid;
    RETURN;
  END IF;

  IF v_tenant_slug IS NULL THEN
    RETURN QUERY SELECT false, 'TENANT_CLAIM_MISSING', 'JWT sin tenant_slug.', NULL::uuid;
    RETURN;
  END IF;

  SELECT t.id INTO v_tenant_id
  FROM public.tenants t
  WHERE t.slug = v_tenant_slug
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RETURN QUERY SELECT false, 'TENANT_NOT_FOUND', 'Tenant no encontrado por slug.', NULL::uuid;
    RETURN;
  END IF;

  SELECT r.role, COALESCE(r.permissions, '{}'::jsonb)
  INTO v_role, v_permissions
  FROM public.get_user_primary_role(v_user_id) r
  LIMIT 1;

  IF v_role IS NULL THEN
    RETURN QUERY SELECT false, 'ROLE_NOT_FOUND', 'No se pudo resolver rol.', NULL::uuid;
    RETURN;
  END IF;

  IF p_quantity <= 0 THEN
    RETURN QUERY SELECT false, 'MOVEMENT_QUANTITY_INVALID', 'La cantidad debe ser mayor a 0.', NULL::uuid;
    RETURN;
  END IF;

  IF p_movement_type NOT IN (
    'purchase_in',
    'sale_out',
    'adjustment_in',
    'adjustment_out',
    'production_in',
    'production_out',
    'transfer_in',
    'transfer_out',
    'count_adjustment'
  ) THEN
    RETURN QUERY SELECT false, 'MOVEMENT_TYPE_INVALID', 'Tipo de movimiento invalido.', NULL::uuid;
    RETURN;
  END IF;

  IF p_movement_type IN ('adjustment_in', 'adjustment_out') THEN
    IF NOT (v_role IN ('owner', 'super_admin') OR COALESCE((v_permissions->>'canAdjustStock')::boolean, false)) THEN
      RETURN QUERY SELECT false, 'PERMISSION_DENIED', 'No tiene permisos para ajustes de inventario.', NULL::uuid;
      RETURN;
    END IF;
  END IF;

  v_sign := CASE
    WHEN p_movement_type IN ('purchase_in', 'adjustment_in', 'production_in', 'transfer_in', 'count_adjustment') THEN 1
    ELSE -1
  END;

  SELECT public.get_stock_balance(p_product_local_id, p_warehouse_local_id) INTO v_current_balance;
  v_resulting_balance := v_current_balance + (v_sign * p_quantity);

  IF v_resulting_balance < 0 THEN
    RETURN QUERY SELECT false, 'NEGATIVE_STOCK_FORBIDDEN', 'Movimiento genera stock negativo.', NULL::uuid;
    RETURN;
  END IF;

  INSERT INTO public.stock_movements (
    local_id,
    tenant_id,
    product_local_id,
    warehouse_local_id,
    movement_type,
    quantity,
    unit_cost,
    reference_type,
    reference_local_id,
    notes,
    created_by,
    created_at
  ) VALUES (
    p_local_id,
    v_tenant_id,
    p_product_local_id,
    p_warehouse_local_id,
    p_movement_type,
    p_quantity,
    p_unit_cost,
    p_reference_type,
    p_reference_local_id,
    p_notes,
    v_user_id,
    now()
  );

  RETURN QUERY
  SELECT true, 'STOCK_MOVEMENT_CREATED', 'Movimiento registrado.', p_local_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.post_inventory_count(
  p_inventory_count_local_id uuid,
  p_reason text DEFAULT NULL
)
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
  v_count record;
  v_diff numeric(19,4);
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

  IF NOT (v_role IN ('owner', 'super_admin') OR COALESCE((v_permissions->>'canAdjustStock')::boolean, false)) THEN
    RETURN QUERY SELECT false, 'PERMISSION_DENIED', 'No tiene permisos para cerrar conteos de inventario.';
    RETURN;
  END IF;

  SELECT *
  INTO v_count
  FROM public.inventory_counts ic
  WHERE ic.tenant_id = v_tenant_id
    AND ic.local_id = p_inventory_count_local_id
    AND ic.deleted_at IS NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'INVENTORY_COUNT_NOT_FOUND', 'Conteo no encontrado.';
    RETURN;
  END IF;

  IF v_count.status <> 'draft' THEN
    RETURN QUERY SELECT false, 'INVENTORY_COUNT_INVALID_STATUS', 'Solo se puede postear conteos en estado draft.';
    RETURN;
  END IF;

  v_diff := v_count.counted_qty - v_count.expected_qty;

  IF v_diff <> 0 THEN
    INSERT INTO public.stock_movements (
      local_id,
      tenant_id,
      product_local_id,
      warehouse_local_id,
      movement_type,
      quantity,
      unit_cost,
      reference_type,
      reference_local_id,
      notes,
      created_by,
      created_at
    ) VALUES (
      gen_random_uuid(),
      v_tenant_id,
      v_count.product_local_id,
      v_count.warehouse_local_id,
      'count_adjustment',
      ABS(v_diff),
      NULL,
      'inventory_count',
      v_count.local_id,
      COALESCE(p_reason, v_count.reason),
      v_user_id,
      now()
    );
  END IF;

  UPDATE public.inventory_counts
  SET status = 'posted',
      reason = COALESCE(p_reason, reason),
      difference_qty = v_diff,
      counted_by = v_user_id,
      counted_at = now(),
      updated_at = now()
  WHERE tenant_id = v_tenant_id
    AND local_id = p_inventory_count_local_id;

  RETURN QUERY SELECT true, 'INVENTORY_COUNT_POSTED', 'Conteo posteado.';
END;
$$;

REVOKE ALL ON FUNCTION public.get_stock_balance(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_stock_movement(uuid, uuid, text, numeric, numeric, text, uuid, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.post_inventory_count(uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_stock_balance(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_stock_movement(uuid, uuid, text, numeric, numeric, text, uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.post_inventory_count(uuid, text) TO authenticated;

COMMIT;
