-- Optimización de la base de datos (Index Cleanup) detectada en auditoría

-- Elimina índices que ocupan espacio y causan penalty de escritura y no se leen nunca
DROP INDEX IF EXISTS public.idx_recipes_tenant_id;
DROP INDEX IF EXISTS public.idx_recipes_created_at;
DROP INDEX IF EXISTS public.idx_production_orders_tenant_id;
DROP INDEX IF EXISTS public.idx_production_orders_created_at;
DROP INDEX IF EXISTS public.idx_production_orders_tenant_created;
DROP INDEX IF EXISTS public.idx_production_logs_tenant_id;
DROP INDEX IF EXISTS public.idx_production_logs_created_at;
DROP INDEX IF EXISTS public.idx_warehouses_tenant_id;
DROP INDEX IF EXISTS public.idx_warehouses_created_at;
DROP INDEX IF EXISTS public.idx_warehouses_tenant_created;
DROP INDEX IF EXISTS public.idx_product_size_colors_tenant_id;
DROP INDEX IF EXISTS public.idx_product_size_colors_created_at;
DROP INDEX IF EXISTS public.idx_stock_movements_tenant_id;
DROP INDEX IF EXISTS public.idx_stock_movements_created_at;
DROP INDEX IF EXISTS public.idx_stock_movements_tenant_created;
DROP INDEX IF EXISTS public.idx_inventory_counts_tenant_id;
DROP INDEX IF EXISTS public.idx_inventory_counts_created_at;
DROP INDEX IF EXISTS public.idx_inventory_counts_tenant_created;
DROP INDEX IF EXISTS public.idx_categories_tenant_id;
DROP INDEX IF EXISTS public.idx_product_presentations_tenant_id;
DROP INDEX IF EXISTS public.idx_user_warehouse_access_tenant_id;
DROP INDEX IF EXISTS public.idx_product_presentations_created_at;
DROP INDEX IF EXISTS public.idx_products_tenant_id;
DROP INDEX IF EXISTS public.idx_products_created_at;
DROP INDEX IF EXISTS public.idx_sales_tenant_id;
DROP INDEX IF EXISTS public.idx_sales_created_at;
DROP INDEX IF EXISTS public.idx_sales_tenant_created;
DROP INDEX IF EXISTS public.idx_sales_tenant_warehouse_created;
DROP INDEX IF EXISTS public.idx_suspended_sales_tenant_id;
DROP INDEX IF EXISTS public.idx_suspended_sales_created_at;
DROP INDEX IF EXISTS public.idx_suspended_sales_tenant_created;
DROP INDEX IF EXISTS public.idx_suspended_sales_tenant_status;
DROP INDEX IF EXISTS public.idx_box_closings_tenant_id;
DROP INDEX IF EXISTS public.idx_box_closings_created_at;
DROP INDEX IF EXISTS public.idx_box_closings_tenant_created;
DROP INDEX IF EXISTS public.idx_box_closings_tenant_warehouse_closed;
DROP INDEX IF EXISTS public.idx_products_local_id;
DROP INDEX IF EXISTS public.idx_purchases_tenant_id;
DROP INDEX IF EXISTS public.idx_purchases_created_at;
DROP INDEX IF EXISTS public.idx_purchases_tenant_created;
DROP INDEX IF EXISTS public.idx_receivings_tenant_id;
DROP INDEX IF EXISTS public.idx_receivings_created_at;
DROP INDEX IF EXISTS public.idx_receivings_tenant_created;
DROP INDEX IF EXISTS public.idx_inventory_lots_tenant_id;
DROP INDEX IF EXISTS public.idx_inventory_lots_created_at;

-- (Notar: Las políticas permisivas deben revisarse a mano para fusionarse con "OR" 
-- en el dashboard de autenticación para no romper la lógica actual si tienen condicionales RLS complejas.)
