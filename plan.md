# Plan Maestro de Implementacion - LogisCore ERP

Este documento es el tablero unico de avance por fases.  
Regla de uso: al cerrar cada fase, actualizar su bloque **Estado**, **Hecho** y **Pendiente**.

## Resumen de estado global

| Fase | Nombre | Estado | Avance |
|---|---|---|---|
| 0 | Preparacion | Completada | 100% |
| 1 | Core + Auth + Tenant | Completada | 100% |
| 2 | Productos y Catalogos | Completada | 100% |
| 3 | Inventario Basico + Multi-bodega | Pendiente | 0% |
| 4 | Ventas + POS | Pendiente | 0% |
| 5 | Compras y Recepciones | Pendiente | 0% |
| 6 | Produccion MRP Ligero | Pendiente | 0% |
| 7 | Facturacion SENIAT | Pendiente | 0% |
| 8 | Sincronizacion Avanzada + Edge Functions | Pendiente | 0% |
| 9 | Reportes, Auditoria y Pulido | Pendiente | 0% |
| 10 | Testing Final + Checklist Pre-PR + Documentacion | Pendiente | 0% |

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
- **Estado:** Pendiente
- **Hecho:** Ninguno
- **Pendiente:** Todo

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
- **Estado:** Pendiente
- **Hecho:** Ninguno
- **Pendiente:** Todo

---

## Fase 5 - Compras y Recepciones

### Objetivo
`purchases` + recepcion a inventario con lotes/seriales.

### Entregables detallados
- Flujo purchase -> receiving -> stock.
- Actualizacion de costo y trazabilidad.
- Integracion con `inventory_lots` y seriales segun configuracion producto.

### Tests y criterios de salida
- Recepcion aumenta stock correctamente.
- Lotes/seriales persisten consistentes.
- `lint/test/build` verde.

### Seguimiento
- **Estado:** Pendiente
- **Hecho:** Ninguno
- **Pendiente:** Todo

---

## Fase 6 - Produccion MRP Ligero

### Objetivo
Implementar `recipes`, `production_orders`, `production_logs`.

### Entregables detallados
- BOM con ingredientes y rendimiento.
- Orden de produccion con consumo teorico vs real.
- Impacto en stock de insumos y producto terminado.

### Tests y criterios de salida
- Validacion stock insumos previo a produccion.
- Consumo real vs teorico.
- `lint/test/build` verde.

### Seguimiento
- **Estado:** Pendiente
- **Hecho:** Ninguno
- **Pendiente:** Todo

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

### Tests y criterios de salida (obligatorios)
- IVA con centimos exactos.
- Ajuste por diferencia lineas vs total.
- Tasas leidas de `tax_rules`.
- `lint/test/build` verde.

### Seguimiento
- **Estado:** Pendiente
- **Hecho:** Ninguno
- **Pendiente:** Todo

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

### Tests y criterios de salida
- Offline -> conflicto -> resolucion por tipo tabla.
- DLQ al 5to fallo.
- Pruebas de contratos de Edge function.
- `lint/test/build` verde.

### Seguimiento
- **Estado:** Pendiente
- **Hecho:** Base de DLQ ya implementada en Fase 0.
- **Pendiente:** Conflictos avanzados, Edge function real, politicas completas.

---

## Fase 9 - Reportes, Auditoria y Pulido

### Objetivo
Reportes clave, `security_audit_log`, optimizacion y purge.

### Entregables detallados
- Reportes ventas/producto/dia, kardex, utilidad bruta, cierre caja.
- Auditoria de seguridad (eventType, userId, tenantId, ipAddress, userAgent, success).
- Politicas de purge (transacciones > 6 meses, etc).
- Optimizar performance en queries y cache local.

### Tests y criterios de salida
- Integridad de reportes con fixtures controlados.
- Validacion de eventos de auditoria sensibles.
- `lint/test/build` verde.

### Seguimiento
- **Estado:** Pendiente
- **Hecho:** Emision de `SECURITY.AUDIT_LOG_REQUESTED` ya disponible en base.
- **Pendiente:** Persistencia completa de auditoria y reportes.

---

## Fase 10 - Testing Final + Checklist Pre-PR + Documentacion

### Objetivo
Cierre tecnico final y evidencia de calidad total.

### Entregables detallados
- Suite completa estable.
- Evidencia checklist seccion 18 al 100%.
- Documentacion tecnica final por modulo.
- Hardening final de arquitectura y revisiones cruzadas.

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

## Regla de actualizacion del documento

Al cerrar cada fase:
1. Actualizar tabla resumen de estado global.
2. Actualizar bloque **Seguimiento** de la fase.
3. Adjuntar evidencia minima:
   - comandos ejecutados (`lint/test/build`)
   - migraciones aplicadas
   - modulos/archivos creados.
