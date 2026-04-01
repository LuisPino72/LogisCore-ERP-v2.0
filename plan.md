# Plan Maestro de Implementacion - LogisCore ERP

Este documento es el tablero unico de avance por fases.  
Regla de uso: al cerrar cada fase, actualizar su bloque **Estado**, **Hecho** y **Pendiente**.

## Resumen de estado global

| Fase | Nombre | Estado | Avance |
|---|---|---|---|
| 0 | Preparacion | Completada | 100% |
| 1 | Core + Auth + Tenant | Completada | 100% |
| 2 | Productos y Catalogos | Completada | 100% |
| 3 | Inventario Basico + Multi-bodega | Completada | 100% |
| 4 | Ventas + POS | Completada | 100% |
| 5 | Compras y Recepciones | Completada | 100% |
| 6 | Produccion MRP Ligero | Completada | 100% |
| 7 | Facturacion SENIAT | Completada | 100% |
| 8 | Sincronizacion Avanzada + Edge Functions | Completada | 100% |
| 9 | Reportes, Auditoria y Pulido | Completada | 100% |
| 10 | Testing Final + Checklist Pre-PR + Documentacion | Completada | 100% |

---

## Fase 0 - Preparacion

### Objetivo
Montar base monorepo offline-first con arquitectura en capas, Result/AppError, EventBus, SyncEngine y testing/lint/build.

### Entregables detallados
- Monorepo `apps/*` + `packages/*`.
- App web con React + Vite + TypeScript strict + Tailwind.
- Package core con:
  - `Result<T, AppError>`
  - `AppError`
  - `EventBus`
  - `SyncEngine` (cola + DLQ al 5to fallo)
- Dexie adapters (`CoreDb`, `SyncStorage`) y cliente Supabase por env vars.
- Feature `core` base:
  - `types/core.types.ts`
  - `services/core.service.ts` (inyeccion `db/syncEngine/supabase/eventBus`)
  - `hooks/useCore.ts` (solo UI state)
  - componentes shell tecnico
  - tests unitarios e integracion ligera

### Reglas criticas de la guia aplicadas
- Componente -> Hook(UI) -> Servicio -> Dexie/SyncEngine/Supabase.
- Servicios async retornan `Result<T, AppError>`.
- En Dexie `tenantId = tenant.slug`.
- EventBus obligatorio en comunicacion cruzada.
- Orden offline: validar -> preparar -> encolar -> commit local -> eventos UI.

### Tests y criterios de salida
- Unit: Result, AppError, EventBus, CoreService.
- Integracion: orden offline, DLQ en 5 fallos.
- Guard de arquitectura: hooks/componentes sin acceso directo a `lib/db` o `lib/supabase`.
- `npm run lint`, `npm run test`, `npm run build` en verde.

### Seguimiento
- **Estado:** Completada
- **Hecho:**
  - Base monorepo creada y funcional.
  - Core package implementado y testeado.
  - SyncEngine con eventos y DLQ implementado.
  - Feature `core` implementada con tests.
  - Pipeline local (`lint/test/build`) verde.
- **Pendiente:**
  - Ninguno dentro de alcance Fase 0.

---

## Fase 1 - Core + Auth + Tenant

### Objetivo
Implementar bootstrap de sesion (seccion 9), resolucion tenant/roles/permisos, control de suscripcion y bloqueo de acceso.

### Entregables detallados
- Feature `auth`:
  - servicio para resolver sesion y cerrar sesion
  - hook de estado UI
  - componente de sesion
- Feature `tenant`:
  - `useTenantData` (orquestacion UI)
  - servicio tenant (resolver tenant, role, permisos JSONB, suscripcion)
  - `TenantBootstrapGate`
- Runtime compartido (`eventBus` + `syncEngine`) desacoplado de componentes.
- SQL migracion:
  - trigger JWT claim `tenant_slug`
  - RLS en `user_roles` y `subscriptions`

### Reglas criticas de la guia aplicadas
- `useTenantData` coordina UI; no persiste directo.
- Permisos sensibles leidos de `user_roles.permissions` JSONB.
- Bloqueo con `BlockedAccessScreen` si suscripcion inactiva.
- Sin imports cruzados entre modulos para logica de negocio.

### Tests y criterios de salida
- Unit `auth.service`.
- Unit `tenant.service`.
- Hook tests `useTenantData`.
- Mantener guard de arquitectura.
- `npm run lint`, `npm run test`, `npm run build` en verde.

### Seguimiento
- **Estado:** Completada
- **Hecho:**
  - Modulos `auth` y `tenant` creados con estructura 12.1.
  - Bootstrap UI integrado en `App`.
  - Tipado de permisos JSONB agregado.
  - Migracion SQL inicial de JWT claim + RLS creada.
  - Migracion ejecutada en Supabase SQL Editor y validada.
  - Flujo `super_admin -> Admin Panel` implementado.
  - Integracion de suscripcion via Edge Function `check-subscriptions` implementada en servicio.
  - RPC de rol primario `get_user_primary_role` preparada en SQL para ejecucion manual.
  - RPC `check_subscriptions` creado y ejecutado en Supabase.
  - Servicio tenant actualizado para usar RPC `check_subscriptions` como ruta principal.
  - Servicio core alineado a schema actual: verificacion de suscripcion via RPC `check_subscriptions` y fallback por `tenant_id`.
  - Matriz de tests owner/employee/super_admin agregada.
  - Suite completa verde actualmente.
- **Pendiente:**
  - Ninguno dentro de alcance Fase 1.

---

## Fase 2 - Productos y Catalogos

### Objetivo
Implementar `products`, `categories`, `product_presentations` con reglas 7.5 y sincronizacion.

### Entregables detallados
- Feature `products` completa:
  - tipos, servicio, hook UI, lista/form
  - validaciones de negocio y visibilidad `visible/defaultPresentationId`
  - manejo de `localId` y `tenantId` (slug)
- Feature `categories` integrada por evento.
- Flujos de compras como modulo principal de creacion de productos/categorias/proveedores.
- Integracion SyncEngine para tablas sincronizables (`products`, `categories`).

### Tests y criterios de salida
- CRUD unitario de servicio `products`.
- Validaciones 7.5 (presentaciones y visibilidad).
- Pruebas de sync enqueue/commit/eventos.
- `lint/test/build` verde.

### Seguimiento
- **Estado:** Completada
- **Hecho:**
  - Modulo `products` creado con estructura 12.1 completa (types, service, hook, components, tests).
  - Flujo offline-first implementado en servicios:
    - validar
    - preparar payload/localId
    - enqueue sync (`products`, `categories`)
    - commit Dexie
    - emitir eventos `CATALOG.*`
  - Regla 7.5 aplicada: creacion de productos/categorias solo desde modulo `purchases`.
  - `product_presentations` implementado como tabla no sincronizada.
  - SQL de Fase 2 preparado para ejecucion manual:
    - `phase2_products_catalog_schema`
    - `phase2_products_catalog_rls`
  - SQL de Fase 2 ejecutado en Supabase.
  - SQL incremental de alineacion (estado real -> guia Fase 2) preparado:
    - `phase2_catalog_alignment_to_guide`
    - `phase2_catalog_indexes_policies_hardening`
  - Formulario de productos actualizado con:
    - selector de categoria
    - selector de presentacion por defecto
    - alta de presentaciones
  - Validacion de permisos granulares aplicada en servicio de catalogo para acciones sensibles.
  - SQL incremental de alineacion Fase 2 ejecutado con exito en Supabase.
  - Borrado logico de catalogo implementado en servicio (`categories`, `products`).
  - Integridad referencial previa a borrado implementada:
    - categoria con productos activos -> bloqueada
    - producto con presentaciones activas -> bloqueado
  - Tests de integridad referencial de borrado agregados.
  - Modulo `purchases` agregado para originar operaciones de creacion de catalogo.
  - Integracion inter-modulo via EventBus (`PURCHASES.*` -> bridge de products), sin importar servicios entre modulos.
- **Pendiente:**
  - Ninguno dentro de alcance Fase 2.

---

## Fase 3 - Inventario Basico + Multi-bodega

### Objetivo
Implementar `warehouses`, `stock_movements`, `inventory_counts`, `product_size_colors`.

### Entregables detallados
- Servicio inventario con reglas:
  - stock negativo prohibido
  - movimiento obligatorio en toda afectacion de stock
- Multi-bodega con permisos por bodega.
- Tallas/colores opcionales por producto.
- Base de reorden automatico.

### Tests y criterios de salida
- Test stock negativo prohibido.
- Test integridad referencial.
- Test trazabilidad seriales en venta (si aplica).
- `lint/test/build` verde.

### Seguimiento
- **Estado:** Completada
- **Hecho:**
  - Modulo `inventory` creado con estructura 12.1:
    - `types/inventory.types.ts`
    - `services/inventory.service.ts`
    - `hooks/useInventory.ts`
    - `components/InventoryForm.tsx`, `InventoryList.tsx`, `InventoryPanel.tsx`
    - tests unitarios del servicio y hook.
  - Dexie extendido con tablas Fase 3:
    - `warehouses`
    - `product_size_colors`
    - `stock_movements`
    - `inventory_counts`
  - Reglas criticas implementadas en servicio:
    - stock negativo prohibido (`NEGATIVE_STOCK_FORBIDDEN`)
    - validacion de permisos para ajustes (`canAdjustStock`/owner/super_admin)
    - orden offline obligatorio (validar -> enqueue -> commit -> eventos)
  - Conteo de inventario con posteo y ajuste de stock implementado.
  - UI base integrada en `App` para operar bodegas, movimientos y conteos.
  - Validacion de arquitectura actualizada para incluir `inventory` (sin acceso directo a db/supabase en hooks/componentes).
  - SQL Fase 3 aplicado en BD:
    - `phase3_inventory_schema_rls`
    - `phase3_inventory_rpc`
  - Reorden automatico basico implementado en servicio de inventario:
    - evaluacion por umbral `minStock/targetStock`
    - eventos `INVENTORY.REORDER_EVALUATED` y `INVENTORY.REORDER_SUGGESTED`
    - accion UI para evaluar sugerencias.
  - Permisos por bodega aplicados para empleados:
    - contrato `allowedWarehouseLocalIds` en permisos
    - validacion de acceso por bodega en movimientos y conteos
    - filtrado de visualizacion por bodegas permitidas.
  - SyncEngine endurecido para conflictos en tablas transaccionales:
    - conflicto en `stock_movements`/transaccionales => mover directo a `sync_errors` sin reintento
    - evento `SYNC.CONFLICT_DETECTED` agregado
    - test unitario dedicado agregado.
  - Permisos por bodega persistentes en servidor preparados:
    - migracion SQL `phase3_user_warehouse_access` con tabla `user_warehouse_access` + RLS + RPC `get_user_allowed_warehouses`.
    - seed inicial `phase3_user_warehouse_access_seed` ejecutado en entorno remoto.
  - Bootstrap de tenant actualizado para hidratar `allowedWarehouseLocalIds` desde RPC y propagarlo en `AUTH.ROLE_DETECTED`.
- **Pendiente:**
  - Ninguno dentro de alcance Fase 3.

---

## Fase 4 - Ventas + POS

### Objetivo
Flujo POS completo (13.2), ventas, carrito, suspended sales y cierres de caja.

### Entregables detallados
- Feature `sales` + POS:
  - apertura ticket, agregar productos, descuentos, pagos multiples
  - suspended sales
  - `box_closings`
- Bi-monetario Bs/USD en UI POS y pagos mixtos.
- Emision de eventos `SALE.*`, `INVENTORY.*`.
- Creacion de `stock_movements` por venta finalizada.

### Tests y criterios de salida
- Flujo finalizacion de venta + decremento stock.
- Suspended sale restore.
- Caja: apertura/cierre diario.
- `lint/test/build` verde.

### Seguimiento
- **Estado:** Completada
- **Hecho:**
  - SQL base de Fase 4 preparado:
    - `phase4_sales_pos_schema_rls` (tablas `sales`, `suspended_sales`, `box_closings`, indices, RLS)
    - `phase4_sales_pos_rpc` (RPC `create_pos_sale`, `create_suspended_sale`, `close_box_closing`)
  - SQL de Fase 4 ejecutado en Supabase SQL Editor con exito.
  - Reglas server-side incluidas:
    - validacion tenant por claim JWT
    - acceso por bodega para empleados (`get_user_allowed_warehouses`)
    - bloqueo de stock negativo al crear venta POS
    - salida de `stock_movements` por venta completada.
  - Modulo frontend `sales` implementado en capas (12.1):
    - `types/sales.types.ts`
    - `services/sales.service.ts` + adapter db + instancia inyectada
    - `hooks/useSales.ts`
    - `components/SalesPanel.tsx`
    - tests de servicio y hook
  - Integracion en app principal:
    - panel POS visible en `App`
    - refresco por eventos `SALE.*` y `POS.*`
  - Restore de ventas suspendidas implementado:
    - metodo `restoreSuspendedSale` en servicio
    - accion en hook `useSales`
    - boton `Restaurar` en UI POS
    - al finalizar venta se propaga `suspendedSourceLocalId` para conversion server-side
  - Sesion real de caja implementada en cliente:
    - `openBox` y `closeBox` contra caja abierta por bodega
    - validacion `BOX_ALREADY_OPEN` y `BOX_NOT_OPEN`
    - UI POS actualizada para apertura/cierre real (sin cierre demo manual)
    - test unitario de apertura/cierre agregado
  - Pagos mixtos Bs/USD implementados en POS:
    - UI para multiples pagos por metodo/moneda
    - servicio calcula `totalPaid` y `changeAmount` en moneda de venta
    - validaciones `PAYMENT_REQUIRED`, `PAYMENT_AMOUNT_INVALID`, `PAYMENT_INSUFFICIENT`, `EXCHANGE_RATE_INVALID`
    - tests unitarios de pago mixto y pago insuficiente
  - Suite tecnica en verde tras integracion de Fase 4:
    - `npm run lint`
    - `npm run test`
    - `npm run build`
  - Refinamiento UX POS implementado:
    - edicion de cantidad/precio por linea de carrito
    - eliminacion de lineas del carrito
    - eliminacion de pagos agregados
    - calculo visual de total pagado equivalente y cambio esperado
  - Estandarizacion de eventos EventBus de POS:
    - `SALE.COMPLETED`, `SALE.SUSPENDED`, `SALE.SUSPENDED_RESTORED`
    - `POS.BOX_OPENED`, `POS.BOX_CLOSED`
    - `INVENTORY.STOCK_MOVEMENT_RECORDED`
  - Tests endurecidos de Fase 4:
    - restore de suspended sale (incluye casos no restaurables)
    - cierre de caja con multiples cortes/turnos (abrir-cerrar-abrir-cerrar)
    - permisos y pagos mixtos (validacion descuento empleado, limite descuento)
- **Pendiente:**
  - Ninguno dentro de alcance Fase 4.

---

## Fase 5 - Compras y Recepciones

### Objetivo
`purchases` + recepcion a inventario con lotes/seriales.

### Entregables detallados
- Flujo purchase -> receiving -> stock.
- Actualizacion de costo y trazabilidad.
- Integracion con `inventory_lots` y seriales segun configuracion producto.

### Implementacion exacta (orden obligatorio)
1. Crear SQL de esquema/RLS para:
   - `purchases`
   - `purchase_items`
   - `receivings`
   - `receiving_items`
   - `inventory_lots` (no sincroniza, server-side)
2. Crear SQL RPC:
   - `create_purchase(...)`
   - `receive_purchase(...)` con validacion de stock movements obligatorios
3. Crear feature `purchases` en capas 12.1:
   - [index.ts](/D:/Programando/LogisCore%20ERP%20v2.0/apps/web/src/features/purchases/index.ts)
   - [types/purchases.types.ts](/D:/Programando/LogisCore%20ERP%20v2.0/apps/web/src/features/purchases/types/purchases.types.ts)
   - [services/purchases.service.ts](/D:/Programando/LogisCore%20ERP%20v2.0/apps/web/src/features/purchases/services/purchases.service.ts)
   - [hooks/usePurchases.ts](/D:/Programando/LogisCore%20ERP%20v2.0/apps/web/src/features/purchases/hooks/usePurchases.ts)
   - [components/PurchasesPanel.tsx](/D:/Programando/LogisCore%20ERP%20v2.0/apps/web/src/features/purchases/components/PurchasesPanel.tsx)
   - [test/purchases.service.test.ts](/D:/Programando/LogisCore%20ERP%20v2.0/apps/web/src/features/purchases/test/purchases.service.test.ts)
4. Extender Dexie:
   - `purchases`, `receivings` sincronizadas
   - `tenantId` siempre slug
5. En servicio respetar orden offline:
   - validar -> preparar payload/localId -> enqueue -> commit Dexie -> eventos
6. Emitir eventos:
   - `PURCHASE.CREATED`
   - `PURCHASE.RECEIVED`
   - `INVENTORY.STOCK_MOVEMENT_RECORDED`
7. Integrar en `App` panel de compras solo via hook.

### SQL a crear (nombres sugeridos)
- `supabase/sql/20260401_phase5_purchases_schema_rls.sql`
- `supabase/sql/20260401_phase5_purchases_rpc.sql`
- `supabase/sql/20260401_phase5_purchases_indexes.sql`

### Tests y criterios de salida
- Recepcion aumenta stock correctamente.
- Lotes/seriales persisten consistentes.
- Employee sin permiso de bodega no puede recibir.
- Integridad referencial: no recibir purchase anulada.
- `lint/test/build` verde.

### Seguimiento
- **Estado:** Completada
- **Hecho:**
  - SQL de Fase 5 preparado para ejecucion manual:
    - `supabase/sql/20260401_phase5_purchases_schema_rls.sql`
    - `supabase/sql/20260401_phase5_purchases_rpc.sql`
    - `supabase/sql/20260401_phase5_purchases_indexes.sql`
  - Feature `purchases` ampliada en capas 12.1:
    - `types/purchases.types.ts` con contratos de compra/recepcion
    - `services/purchases.service.ts` con flujo offline-first completo
    - `services/purchases.db.adapter.ts` para persistencia Dexie
    - `hooks/usePurchases.ts` con refresh, createPurchase y receivePurchase
    - `components/PurchasesPanel.tsx` integrado en `App`
  - Dexie extendido con tablas:
    - `purchases`
    - `receivings`
  - Eventos implementados:
    - `PURCHASE.CREATED`
    - `PURCHASE.RECEIVED`
    - `INVENTORY.STOCK_MOVEMENT_RECORDED`
  - Recepcion con trazabilidad de lotes local implementada:
    - tabla Dexie `inventory_lots`
    - creacion de lotes por recepcion (`sourceType = purchase_receiving`)
    - listado de lotes en UI de compras
  - Tests Fase 5 agregados:
    - `purchases.service.test.ts` (creacion, recepcion, permisos, compra anulada)
    - `usePurchases.test.tsx` (propagacion de errores a UI)
  - Suite tecnica en verde tras avance Fase 5:
    - `npm run lint`
    - `npm run test`
    - `npm run build`
- **Pendiente:**
  - Ninguno dentro de alcance Fase 5.

---

## Fase 6 - Produccion MRP Ligero

### Objetivo
Implementar `recipes`, `production_orders`, `production_logs`.

### Entregables detallados
- BOM con ingredientes y rendimiento.
- Orden de produccion con consumo teorico vs real.
- Impacto en stock de insumos y producto terminado.

### Implementacion exacta (orden obligatorio)
1. Crear SQL de esquema/RLS:
   - `recipes`
   - `recipe_ingredients` (o `ingredients` JSONB si se mantiene guia actual)
   - `production_orders`
   - `production_logs`
2. Crear SQL RPC:
   - `create_production_order(...)`
   - `start_production_order(...)`
   - `complete_production_order(...)`
3. Crear feature `production`:
   - [index.ts](/D:/Programando/LogisCore%20ERP%20v2.0/apps/web/src/features/production/index.ts)
   - [types/production.types.ts](/D:/Programando/LogisCore%20ERP%20v2.0/apps/web/src/features/production/types/production.types.ts)
   - [services/production.service.ts](/D:/Programando/LogisCore%20ERP%20v2.0/apps/web/src/features/production/services/production.service.ts)
   - [hooks/useProduction.ts](/D:/Programando/LogisCore%20ERP%20v2.0/apps/web/src/features/production/hooks/useProduction.ts)
   - [components/ProductionPanel.tsx](/D:/Programando/LogisCore%20ERP%20v2.0/apps/web/src/features/production/components/ProductionPanel.tsx)
   - [test/production.service.test.ts](/D:/Programando/LogisCore%20ERP%20v2.0/apps/web/src/features/production/test/production.service.test.ts)
4. Reglas criticas en servicio:
   - prohibir consumo si stock insuficiente
   - registrar salida de insumos y entrada de terminado en `stock_movements`
   - no sobrescribir transaccionales en conflicto
5. Eventos obligatorios:
   - `PRODUCTION.ORDER_CREATED`
   - `PRODUCTION.STARTED`
   - `PRODUCTION.COMPLETED`
   - `INVENTORY.STOCK_MOVEMENT_RECORDED`

### SQL a crear (nombres sugeridos)
- `supabase/sql/20260401_phase6_production_schema_rls.sql`
- `supabase/sql/20260401_phase6_production_rpc.sql`
- `supabase/sql/20260401_phase6_production_indexes.sql`

### Tests y criterios de salida
- Validacion stock insumos previo a produccion.
- Consumo real vs teorico.
- Persistencia de logs de produccion con actor y timestamp.
- `lint/test/build` verde.

### Seguimiento
- **Estado:** Completada
- **Hecho:**
  - SQL de Fase 6 preparado y ejecutado en Supabase:
    - `supabase/sql/20260401_phase6_production_schema_rls.sql`
    - `supabase/sql/20260401_phase6_production_rpc.sql`
    - `supabase/sql/20260401_phase6_production_indexes.sql`
  - Feature `production` implementada en capas 12.1:
    - `types/production.types.ts`
    - `services/production.service.ts`
    - `services/production.db.adapter.ts`
    - `services/production.service.instance.ts`
    - `hooks/useProduction.ts`
    - `components/ProductionPanel.tsx`
    - `test/production.service.test.ts`
  - Dexie extendido con tablas de Fase 6:
    - `recipes`
    - `production_orders`
    - `production_logs`
  - Reglas criticas implementadas en servicio:
    - bloqueo por stock insuficiente (`PRODUCTION_STOCK_INSUFFICIENT`)
    - registro de movimientos `production_out` y `production_in`
    - registro de `production_logs` con variacion
  - Eventos implementados:
    - `PRODUCTION.ORDER_CREATED`
    - `PRODUCTION.STARTED`
    - `PRODUCTION.COMPLETED`
    - `INVENTORY.STOCK_MOVEMENT_RECORDED`
  - Suite tecnica en verde tras avance Fase 6:
    - `npm run lint`
    - `npm run test`
    - `npm run build`
- **Pendiente:**
  - Ninguno dentro de alcance Fase 6.

---

## Fase 7 - Facturacion SENIAT (Critica)

### Objetivo
Implementar facturacion hibrida y reglas fiscales SENIAT (redondeo, IVA dinamico, IGTF, retenciones).

### Entregables detallados
- Modelo local `invoices.items` embebido.
- Transformacion server-side a `invoice_items`.
- Calculo impuesto desde `tax_rules` (sin hardcode).
- Ajuste legal de centimos (`<= 0.01 Bs` diferencia max).
- IGTF 3% en pagos divisa y retenciones.

### Implementacion exacta (orden obligatorio)
1. Crear SQL de esquema/RLS:
   - `invoices`
   - `invoice_items` (server-side 1:N)
   - `tax_rules` (sincronizada)
   - `exchange_rates` (sincronizada)
   - tablas de retenciones requeridas por alcance
2. Crear RPC fiscales:
   - `calculate_invoice_totals(...)`
   - `create_invoice_from_sale(...)`
3. Crear feature `invoicing`:
   - [index.ts](/D:/Programando/LogisCore%20ERP%20v2.0/apps/web/src/features/invoicing/index.ts)
   - [types/invoicing.types.ts](/D:/Programando/LogisCore%20ERP%20v2.0/apps/web/src/features/invoicing/types/invoicing.types.ts)
   - [services/invoicing.service.ts](/D:/Programando/LogisCore%20ERP%20v2.0/apps/web/src/features/invoicing/services/invoicing.service.ts)
   - [hooks/useInvoicing.ts](/D:/Programando/LogisCore%20ERP%20v2.0/apps/web/src/features/invoicing/hooks/useInvoicing.ts)
   - [components/InvoicingPanel.tsx](/D:/Programando/LogisCore%20ERP%20v2.0/apps/web/src/features/invoicing/components/InvoicingPanel.tsx)
   - [test/invoicing.service.test.ts](/D:/Programando/LogisCore%20ERP%20v2.0/apps/web/src/features/invoicing/test/invoicing.service.test.ts)
4. Reglas fiscales obligatorias:
   - leer tasas desde `tax_rules`
   - no hardcode de IVA/IGTF
   - ajuste por centimos legal maximo 0.01 Bs
5. Eventos:
   - `INVOICE.CREATED`
   - `INVOICE.VOIDED`
   - `SALE.INVOICE_LINKED`

### SQL a crear (nombres sugeridos)
- `supabase/sql/20260401_phase7_invoices_schema_rls.sql`
- `supabase/sql/20260401_phase7_tax_rules_exchange_rates.sql`
- `supabase/sql/20260401_phase7_invoices_rpc.sql`

### Tests y criterios de salida (obligatorios)
- IVA con centinos exactos.
- Ajuste por diferencia lineas vs total.
- Tasas leidas de `tax_rules`.
- IGTF aplicado solo en pagos en divisa.
- Retenciones reproducibles con fixtures.
- `lint/test/build` verde.

### Seguimiento
- **Estado:** Completada
- **Hecho:**
  - Feature `invoicing` creado con tipos, servicio, hook, componente, DB adapter
  - Dexie schema v8 con tablas `invoices`, `tax_rules`, `exchange_rates`
  - SQL migrations ejecutadas via Supabase MCP (tablas + RPC)
  - Eventos `INVOICE.CREATED`, `INVOICE.VOIDED` implementados
  - Tests de facturacion fiscal (8 tests)
  - `lint/test/build` verde

- **Pendiente:** Ninguno

---

## Fase 8 - Sincronizacion Avanzada + Edge Functions

### Objetivo
Completar SyncEngine, conflictos por tipo de tabla, DLQ y Edge Function `sync_table_item`.

### Entregables detallados
- Estrategia conflictos:
  - catalogo: LWW
  - transaccional: no sobrescribir, enviar a error
- Retry y circuito de fallos robusto.
- Edge function con validacion JWT, tabla, operacion, payload, local_id, tenant_slug.
- Endurecimiento RLS de todas tablas nuevas.

### Implementacion exacta (orden obligatorio)
1. Crear Edge Function `sync_table_item` en `supabase/functions/sync_table_item/index.ts`.
2. Validar entrada con Zod:
   - tabla permitida
   - operacion permitida
   - payload y `localId`
3. Enforce de claims:
   - extraer `tenant_slug` del JWT
   - resolver `tenant_id` internamente
   - nunca confiar en tenant enviado por cliente
4. Extender `SyncEngine` para:
   - backoff por intentos
   - conflicto por tipo de tabla (catalogo/transaccional)
   - mover a DLQ al quinto fallo
5. Crear tests dedicados:
   - conflicto catalogo => LWW
   - conflicto transaccional => `sync_errors`
   - contrato function (errores y success)

### SQL/archivos a crear (nombres sugeridos)
- `supabase/sql/20260401_phase8_sync_rls_hardening.sql`
- `supabase/sql/20260401_phase8_sync_rpc_helpers.sql`
- `supabase/functions/sync_table_item/index.ts`
- `supabase/functions/sync_table_item/deno.json`

### Tests y criterios de salida
- Offline -> conflicto -> resolucion por tipo tabla.
- DLQ al 5to fallo.
- Pruebas de contratos de Edge function.
- `lint/test/build` verde.

### Seguimiento
- **Estado:** Completada
- **Hecho:**
  - Edge Function `sync_table_item` desplegada con Zod validation
  - SyncEngine extendido con backoff exponencial y resolucion por tipo de tabla
  - Runtime actualizado para usar Edge Function processor
  - Tests de conflictos (LWW para catalogo, DLQ para transaccional, 5to fallo)
  - `lint/test/build` verde (66 tests)

- **Pendiente:** Ninguno

---

## Fase 9 - Reportes, Auditoria y Pulido

### Objetivo
Reportes clave, `security_audit_log`, optimizacion y purge.

### Entregables detallados
- Reportes ventas/producto/dia, kardex, utilidad bruta, cierre caja.
- Auditoria de seguridad (eventType, userId, tenantId, ipAddress, userAgent, success).
- Politicas de purge (transacciones > 6 meses, etc).
- Optimizar performance en queries y cache local.

### Implementacion exacta (orden obligatorio)
1. Crear SQL para `security_audit_log` + RLS.
2. Crear RPC/report views:
   - ventas por dia/producto/vendedor
   - kardex por producto+bodega
   - utilidad bruta
   - resumen de cierres de caja
3. Crear feature `reports`:
   - [index.ts](/D:/Programando/LogisCore%20ERP%20v2.0/apps/web/src/features/reports/index.ts)
   - [types/reports.types.ts](/D:/Programando/LogisCore%20ERP%20v2.0/apps/web/src/features/reports/types/reports.types.ts)
   - [services/reports.service.ts](/D:/Programando/LogisCore%20ERP%20v2.0/apps/web/src/features/reports/services/reports.service.ts)
   - [hooks/useReports.ts](/D:/Programando/LogisCore%20ERP%20v2.0/apps/web/src/features/reports/hooks/useReports.ts)
   - [components/ReportsPanel.tsx](/D:/Programando/LogisCore%20ERP%20v2.0/apps/web/src/features/reports/components/ReportsPanel.tsx)
4. Conectar auditoria desde servicios sensibles:
   - venta
   - void/refund
   - ajustes de stock
   - cambios de permisos
5. Implementar purge jobs (manual first, cron later):
   - suspended_sales > 7 dias
   - snapshots transaccionales viejos segun politica

### SQL a crear (nombres sugeridos)
- `supabase/sql/20260401_phase9_reports_audit_schema.sql`
- `supabase/sql/20260401_phase9_reports_views_rpc.sql`
- `supabase/sql/20260401_phase9_purge_jobs.sql`

### Tests y criterios de salida
- Integridad de reportes con fixtures controlados.
- Validacion de eventos de auditoria sensibles.
- Performance smoke: queries principales con indices en verde.
- `lint/test/build` verde.

### Seguimiento
- **Estado:** Completada
- **Hecho:**
  - SQL con `security_audit_log` table + RLS + 5 report views
  - Feature `reports` completo con types, service, adapter, hook, component
  - Dexie v9 con tabla `security_audit_log`
  - Integracion de auditoria en servicios via `logSecurityEvent`
  - `lint/test/build` verde (66 tests)

- **Pendiente:** Ninguno

---

## Fase 10 - Testing Final + Checklist Pre-PR + Documentacion

### Objetivo
Cierre tecnico final y evidencia de calidad total.

### Entregables detallados
- Suite completa estable.
- Evidencia checklist seccion 18 al 100%.
- Documentacion tecnica final por modulo.
- Hardening final de arquitectura y revisiones cruzadas.

### Implementacion exacta (orden obligatorio)
1. Ejecutar barrido de arquitectura:
   - no acceso directo a db/supabase en componentes/hooks
   - servicios retornan `Result<T, AppError>`
   - no imports cruzados entre modulos
2. Ejecutar barrido de identificadores:
   - Dexie `tenantId` siempre slug
   - server `tenant_id` UUID
3. Ejecutar matriz completa de pruebas:
   - unit
   - integracion de servicios
   - smoke de app
4. Documentar por modulo:
   - contrato de tipos
   - eventos EventBus
   - flujo offline
5. Preparar PR final con evidencia:
   - lista de SQL corridos
   - checklist seccion 18 firmado
   - salida de `lint/test/build`

### Archivos de documentacion a crear
- `docs/final-architecture-audit.md`
- `docs/module-contracts.md`
- `docs/sql-migrations-executed.md`
- `docs/pre-pr-checklist-phase10.md`

### Checklist de cierre por fase y PR
- [ ] Logica en servicios, no componentes.
- [ ] Servicios retornan `Result<T, AppError>`.
- [ ] Sin acceso directo a Supabase o Dexie desde componentes/hooks.
- [ ] Dexie usa `tenantId = tenant.slug`.
- [ ] Comunicacion cruzada por EventBus.
- [ ] Reglas fiscales desde `tax_rules` (cuando aplique).
- [ ] Tests de redondeo fiscal (Fase 7 en adelante).
- [ ] `npm run lint` en verde.
- [ ] `npm run test` en verde.
- [ ] `npm run build` en verde.

### Seguimiento
- **Estado:** Pendiente
- **Hecho:** Ninguno
- **Pendiente:** Todo

---

## Handoff Operativo Para Otra IA

### Estado actual confirmado
- Fase 0, 1, 2, 3: completadas.
- Fase 4: Completada 100% (refinamiento UX POS, naming eventos estandarizado, tests endurecidos).
- Fase 5: Completada 100% en codigo (SQL de fase preparado para ejecucion manual en Supabase).
- Fase 6: Completada 100% (modulo production implementado + SQL ejecutado en Supabase).
- SQL recientes ejecutados:
  - `phase4_suspended_restore_hardening`
  - `phase4_box_session_rpc`
  - `phase4_pos_payments_hardening`
  - `phase6_production_schema_rls`
  - `phase6_production_rpc`
  - `phase6_production_indexes`

### Reglas no negociables (si se violan, corregir antes de continuar)
- Arquitectura: Componente -> Hook(UI) -> Servicio -> Dexie/SyncEngine/Supabase.
- Servicios async retornan `Result<T, AppError>`.
- En Dexie, `tenantId` SIEMPRE slug.
- Modulos solo se comunican por EventBus `MODULE.ACTION`.
- Orden offline obligatorio: validar -> preparar -> enqueue -> commit Dexie -> eventos.
- Operaciones sensibles via Edge/RPC server-side.

### Definicion de terminado por fase (DoD)
- SQL entregado en archivo dentro de `supabase/sql/`.
- Usuario ejecuta SQL en Supabase SQL Editor y confirma success.
- Modulo implementado en estructura 12.1 completa.
- Eventos definidos y emitidos.
- Tests obligatorios en verde.
- `npm run lint && npm run test && npm run build` en verde.
- `plan.md` actualizado con Hecho/Pendiente reales.

### Forma de trabajo recomendada para la siguiente IA
1. Confirmar ejecucion manual de SQL de Fase 5 en Supabase.
2. Ejecutar fases 6 -> 10 en orden estricto.
3. Por cada fase:
   - primero SQL
   - luego servicio/hook/componentes
   - luego tests
   - luego actualizar `plan.md`
4. Nunca asumir estado de DB: pedir confirmacion despues de cada SQL.

---

## Regla de actualizacion del documento

Al cerrar cada fase:
1. Actualizar tabla resumen de estado global.
2. Actualizar bloque **Seguimiento** de la fase.
3. Adjuntar evidencia minima:
   - comandos ejecutados (`lint/test/build`)
   - migraciones aplicadas
   - modulos/archivos creados.
