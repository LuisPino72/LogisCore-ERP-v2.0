-- =============================================================================
-- Políticas RLS para LogisCore ERP v6.5
-- Generado: 2026-04-17
-- Desplegado: 2026-04-17 via MCP Supabase
-- Estado: ✅ DESPLEGADO
-- Objetivo: Documentar y versionar el esquema de seguridad actual
-- =============================================================================

-- =============================================================================
-- HABILITAR RLS EN TODAS LAS TABLAS
-- =============================================================================

-- Las tablas ya tienen RLS habilitado. Este script documenta las políticas existentes.

-- =============================================================================
-- POLÍTICAS DE AUDITORÍA
-- =============================================================================

-- audit_log_entries: Aislamiento por tenant + rol admin
CREATE POLICY "Admins can access audit logs" ON public.audit_log_entries
  FOR ALL
  USING ((SELECT get_auth_role()) = 'admin');

CREATE POLICY "Audit logs tenant isolation" ON public.audit_log_entries
  FOR SELECT
  USING ((tenant_id = (SELECT get_auth_tenant_id())) OR (SELECT get_auth_role()) = 'admin');

CREATE POLICY "Audit logs insert tenant isolation" ON public.audit_log_entries
  FOR INSERT
  WITH CHECK ((tenant_id = (SELECT get_auth_tenant_id())) OR (SELECT get_auth_role()) = 'admin');

-- =============================================================================
-- POLÍTICAS DE TENANT (Aislamiento Multi-tenant)
-- =============================================================================

-- tenants: Admin puede ver todos, usuarios solo su tenant
CREATE POLICY "Tennant isolation for tenants" ON public.tenants
  FOR SELECT
  USING ((id = (SELECT get_auth_tenant_id())) OR (SELECT get_auth_role()) = 'admin');

-- user_roles: Solo propio o admin
CREATE POLICY "Users can read their own role optimized" ON public.user_roles
  FOR SELECT
  USING ((user_id = auth.uid()) OR (SELECT get_auth_role()) = 'admin');

-- suppliers: Aislamiento completo por tenant
CREATE POLICY "suppliers_tenant_isolation" ON public.suppliers
  FOR ALL
  USING (tenant_id IN (
    SELECT t.id FROM tenants t
    JOIN user_roles ur ON ur.tenant_id = t.id
    WHERE ur.user_id = auth.uid()
  ))
  WITH CHECK (tenant_id IN (
    SELECT t.id FROM tenants t
    JOIN user_roles ur ON ur.tenant_id = t.id
    WHERE ur.user_id = auth.uid()
  ));

-- =============================================================================
-- POLÍTICAS DE PRODUCTOS
-- =============================================================================

-- products: Tenant + global por business_type
CREATE POLICY "products_select_tenant_plus_global" ON public.products
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid() AND ur.tenant_id = products.tenant_id AND ur.is_active = true)
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN tenants t ON t.id = ur.tenant_id
      WHERE ur.user_id = auth.uid() AND ur.is_active = true AND products.is_global = true AND products.business_type_id = t.business_type_id
    )
    OR (SELECT get_auth_role()) = 'admin'
  );

-- =============================================================================
-- POLÍTICAS DE VENTAS (Con permisos RBAC)
-- =============================================================================

CREATE POLICY "Sales select" ON public.sales
  FOR SELECT
  USING (((tenant_id = (SELECT get_auth_tenant_id())) AND (SELECT is_auth_active())) OR (SELECT get_auth_role()) = 'admin');

CREATE POLICY "Sales insert" ON public.sales
  FOR INSERT
  WITH CHECK (
    ((tenant_id = (SELECT get_auth_tenant_id())) AND (SELECT is_auth_active()) AND has_permission(auth.uid(), 'SALES:POS'))
    OR (SELECT get_auth_role()) = 'admin'
  );

CREATE POLICY "Sales update" ON public.sales
  FOR UPDATE
  USING (
    ((tenant_id = (SELECT get_auth_tenant_id())) AND (SELECT is_auth_active()) AND has_permission(auth.uid(), 'SALES:VOID'))
    OR (SELECT get_auth_role()) = 'admin'
  );

-- =============================================================================
-- POLÍTICAS DE FACTURAS (Con permisos RBAC)
-- =============================================================================

CREATE POLICY "Invoices select" ON public.invoices
  FOR SELECT
  USING (((tenant_id = (SELECT get_auth_tenant_id())) AND (SELECT is_auth_active())) OR (SELECT get_auth_role()) = 'admin');

CREATE POLICY "Invoices insert" ON public.invoices
  FOR INSERT
  WITH CHECK (
    ((tenant_id = (SELECT get_auth_tenant_id())) AND (SELECT is_auth_active()) AND has_permission(auth.uid(), 'INVOICE:ISSUE'))
    OR (SELECT get_auth_role()) = 'admin'
  );

CREATE POLICY "Invoices update" ON public.invoices
  FOR UPDATE
  USING (
    ((tenant_id = (SELECT get_auth_tenant_id())) AND (SELECT is_auth_active()) AND has_permission(auth.uid(), 'INVOICE:VOID'))
    OR (SELECT get_auth_role()) = 'admin'
  );

-- =============================================================================
-- POLÍTICAS DE INVENTARIO
-- =============================================================================

-- inventory_lots: Aislamiento por tenant
CREATE POLICY "Users can access inventory_lots v2" ON public.inventory_lots
  FOR ALL
  USING (((tenant_id = (SELECT get_auth_tenant_id())) AND (SELECT is_auth_active())) OR (SELECT get_auth_role()) = 'admin')
  WITH CHECK (((tenant_id = (SELECT get_auth_tenant_id())) AND (SELECT is_auth_active())) OR (SELECT get_auth_role()) = 'admin');

-- =============================================================================
-- POLÍTICAS DE WAREHOUSES
-- =============================================================================

CREATE POLICY "Users can access warehouses" ON public.warehouses
  FOR ALL
  USING ((tenant_id = (SELECT get_auth_tenant_id())) OR (SELECT get_auth_role()) = 'admin')
  WITH CHECK ((tenant_id = (SELECT get_auth_tenant_id())) OR (SELECT get_auth_role()) = 'admin');

-- =============================================================================
-- POLÍTICAS DE GESTIÓN (Admin only)
-- =============================================================================

-- global_config, audit_log_entries, user_permissions: Solo admin
CREATE POLICY "Admins can access global config" ON public.global_config
  FOR ALL
  USING ((SELECT get_auth_role()) = 'admin');

CREATE POLICY "Admins can manage permissions" ON public.user_permissions
  FOR ALL
  USING ((SELECT get_auth_role()) = 'admin');

-- =============================================================================
-- POLÍTICAS DE CATÁLOGOS GLOBALES (business_types, plans)
-- =============================================================================

CREATE POLICY "Anyone can read business_types" ON public.business_types
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can read plans" ON public.plans
  FOR SELECT
  USING (true);

-- =============================================================================
-- NOTAS
-- =============================================================================
-- 1. Las políticas usan funciones helpers: get_auth_tenant_id(), get_auth_role(), is_auth_active(), has_permission()
-- 2. Las políticas de SELECT普遍 usan tenant isolation + role check
-- 3. Las políticas de INSERT/UPDATE incluyen validación de permisos RBAC
-- 4. service_role tiene acceso completo a todas las tablas
-- =============================================================================