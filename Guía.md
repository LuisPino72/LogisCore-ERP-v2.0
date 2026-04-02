# LogisCore ERP - Guía de Desarrollo

> Fuente de verdad operativa. Si la implementación, el reporte y esta guía no coinciden, se debe corregir la implementación o actualizar esta guía en el mismo bloque de trabajo.

---

## 1. Objetivo y Stack

**Objetivo:** ERP ligero multi-tenant, offline-first.
- **Frontend:** React 19, Vite, TypeScript strict, Tailwind 4
- **Estado:** Zustand | **Offline:** Dexie
- **Backend:** Supabase Auth, Postgres, RLS, Edge Functions
- **Sync:** `SyncEngine` | **Testing:** Vitest

---

## 2. Reglas Canónicas de Identificadores

| Campo | Donde | Tipo | Regla |
|-------|-------|------|-------|
| `tenant_id` | Supabase | uuid | FK real del tenant |
| `tenant_slug` | Supabase | text | Filtro legible por tenant |
| `tenantId` | Dexie | text | **SIEMPRE slug, nunca UUID** |
| `local_id` | Supabase | uuid | ID generado en cliente |
| `localId` | Dexie | string | Mismo valor que `local_id` |

**En cliente:** Dexie filtra por `tenantId = tenant.slug`
**En servidor:** Supabase filtra por `tenant_slug`

---

## 3. Arquitectura

### 3.1 Capas (REGLA DE ORO)
```
componente → hook → servicio → Dexie / SyncEngine / Supabase
```
- **PROHIBIDO:** acceder directo a Supabase/Dexie desde componentes
- **PROHIBIDO:** importar servicios entre módulos → usar EventBus
- **Hooks:** coordinación UI, **NO** lógica de persistencia
- **Servicios:** lógica de negocio, validación, persistencia, sync

### 3.2 Manejo de Errores
Toda función async **DEBE** retornar `Result<T, AppError>`
- Formato códigos: `{MÓDULO}_{ENTIDAD}_{ACCIÓN}_{CONDICIÓN}`
- Mensajes en español, enfocados en acción correctiva
- Propiedad `retryable`: true para errores transitorios, false para validaciones

### 3.3 Orden de Sync (OBLIGATORIO)
1. Validar → 2. Preparar payload y `localId` → 3. Encolar sync → 4. Commit Dexie → 5. Emitir eventos

### 3.4 Relaciones entre Tablas (CRÍTICA)

**Productos y Categorías:**
- `products.category_id` → `categories.local_id`
- `products.default_presentation_id` → `product_presentations.id`

**Inventario y Movimientos:**
- `stock_movements.product_local_id` → `products.local_id`
- `stock_movements.warehouse_local_id` → `warehouses.local_id`
- `inventory_lots.product_id` → `products.id`

**Producción y Recetas:**
- `recipes.product_local_id` → `products.local_id`
- `production_logs.recipe_local_id` → `recipes.local_id`
- `recipes.ingredients`, `production_logs.ingredients_used` son JSONB

**Ventas y Facturación:**
- `sales.customer_id` → `customers.id`
- `invoices.customer_id` → `customers.id`
- `invoices.sale_local_id` → `sales.local_id`
- **Facturación híbrida:** items embebidos en Dexie, transformados a `invoice_items` en servidor

**Patrón de FKs:**
- Tablas sincronizadas → usan `local_id`
- Tablas server-side → usan `id` (UUID)

---

## 4. Sincronización

### 4.1 Tablas que Sincronizan
`products`, `categories`, `sales`, `purchases`, `recipes`, `production_logs`, `suppliers`, `customers`, `invoices`, `invoice_settings`, `movements`, `taxpayer_info`, `security_audit_log`, `suspended_sales`, `stock_movements`, `warehouses`, `product_size_colors`, `inventory_counts`, `production_orders`, `box_closings`, `tax_rules`, `exchange_rates`, `production_log_lot_traceability`, `sales_commissions`, `product_preferred_suppliers`, `customer_credit_limits`

### 4.2 Tablas que NO Sincronizan
`user_roles`, `subscriptions`, `business_types`, `invoice_items`, `inventory_lots`, `product_presentations`

### 4.3 Estrategia de Conflictos
| Tipo de tabla | Estrategia | Acción |
|---------------|------------|--------|
| Catálogo (products) | Last Write Wins | Sobrescribir |
| Transaccional (sales) | **NUNCA** | Marcar `sync_error` |
| Configuración | Last Write Wins | Validar y sobrescribir |

### 4.4 Dead Letter Queue
Si item falla 5 veces → mover a tabla `sync_errors`

---

## 5. Base de Datos

### 5.1 Convenciones
- Tablas: `snake_case`, plural (`stock_movements`)
- Columnas: `snake_case` (`created_at`, `tenant_id`)
- Dinero: `NUMERIC(19,4)` - **NUNCA** FLOAT/REAL
- Fechas: `TIMESTAMPTZ` (UTC)
- Borrado lógico: `deleted_at` NULL=activo

### 5.2 Tipos de Datos

| Concepto | Tipo Postgres | Regla |
|----------|---------------|-------|
| Dinero | `NUMERIC(19,4)` | **NUNCA** FLOAT/REAL |
| ID (servidor) | `UUID` | gen_random_uuid() |
| ID (cliente) | `UUID` | crypto.randomUUID() |
| Fechas | `TIMESTAMPTZ` | UTC en DB |
| Banderas | `BOOLEAN` | Default FALSE |

### 5.3 Índices Obligatorios
```sql
CREATE INDEX idx_[tabla]_tenant_id ON public.[tabla](tenant_id);
CREATE INDEX idx_[tabla]_created_at ON public.[tabla](created_at DESC);
CREATE INDEX idx_[tabla]_tenant_created ON public.[tabla](tenant_id, created_at DESC);
```

### 5.4 Inventario de Tablas

| Tabla | local_id | Sync | Notas |
|-------|----------|------|-------|
| **tenants** | No | - | Núcleo |
| **user_roles** | No | - | permisos JSONB |
| **products** | Sí | ✓ | sku, is_serialized |
| **product_presentations** | No | - | is_default |
| **categories** | Sí | ✓ | |
| **warehouses** | Sí | ✓ | multi-bodega |
| **product_size_colors** | Sí | ✓ | tallas/colores |
| **stock_movements** | Sí | ✓ | ref_doc_type, cost_layer |
| **inventory_counts** | Sí | ✓ | |
| **inventory_lots** | No | - | quality_status |
| **sales** | Sí | ✓ | sales_person_id, pos_terminal_id |
| **suspended_sales** | Sí | ✓ | |
| **box_closings** | Sí | ✓ | readings |
| **purchases** | Sí | ✓ | |
| **receivings** | Sí | ✓ | |
| **recipes** | Sí | ✓ | bom_version |
| **production_orders** | Sí | ✓ | |
| **production_logs** | Sí | ✓ | |
| **invoices** | Sí | ✓ | xml/json_seniat |
| **tax_rules** | Sí | ✓ | jurisdiction |
| **exchange_rates** | Sí | ✓ | jurisdiction |
| **production_log_lot_traceability** | Sí | ✓ | nueva |
| **sales_commissions** | Sí | ✓ | nueva |
| **product_preferred_suppliers** | Sí | ✓ | nueva |
| **customer_credit_limits** | Sí | ✓ | nueva |

### 5.5 Edge Functions y RPC

| Función | Tipo | Descripción |
|---------|------|--------------|
| `sync_table_item` | Edge | Sincronización de tablas |
| `check_subscriptions` | RPC | Verificar suscripción |
| `get_user_primary_role` | RPC | Obtener rol básico |
| `get_user_primary_role_extended` | RPC | Rol + permisos + email + nombre |
| `get_stock_balance` | RPC | Stock por producto/bodega |
| `calculate_commission` | Edge | Calcular comisión de venta |
| `get_product_stock_by_warehouse` | Edge | Stock por producto/bodega |
| `validate_inventory_lot_quality` | Edge | Validar estado de lote |

### 5.6 Triggers y Lógica de Servidor

**Regla de Oro:** Mínima lógica en Base de Datos.
- **✅ Permitido:** updated_at, audit_logs, validaciones críticas de stock
- **❌ Prohibido:** Cálculos de negocio (subtotales, IVA), lógica de sync

---

## 6. Seguridad

### 6.1 RLS (REQUISITO MÍNIMO)
Toda tabla nueva debe tener:
```sql
ALTER TABLE public.mi_tabla ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mi_tabla FORCE ROW LEVEL SECURITY;
```

**Política de lectura:**
```sql
CREATE POLICY "Usuarios ven solo su tenant"
ON public.nueva_tabla FOR SELECT
USING ( tenant_id = (SELECT id FROM tenants WHERE slug = current_setting('request.jwt.claim.tenant_slug')) );
```

### 6.2 Custom Claims JWT
Trigger para agregar `tenant_slug` al JWT:
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.tenant_slug', 
    COALESCE((SELECT slug FROM tenants WHERE owner_user_id = NEW.id), ''),
    true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 6.3 Auditoría de Seguridad
Eventos sensibles deben registrar: `eventType`, `userId`, `tenantId`, `ipAddress`, `userAgent`, `success`

---

## 7. Reglas de Negocio

### 7.1 Inventario
- Toda venta/compra/producción debe registrar `stock_movements`
- Usar chequeos de integridad antes de borrar entidades
- Multi-bodega: permisos por bodega en `user_roles.permissions.allowedWarehouseLocalIds`

### 7.2 Facturación SENIAT
- Backend: `invoices` + `invoice_items` (relación 1:N)
- Items embebidos en Dexie, transformados en servidor
- **Regla de céntimos:** total no puede diferir > 0.01 Bs
- **Tasas IVA:** leer de `tax_rules`, **NUNCA hardcodear**
- **Retenciones:** IVA 75%, ISLR según tabla SENIAT

### 7.3 Sistema de Costeo
- **FIFO:** Costo de unidades más antiguas
- **Promedio ponderado:** Costo medio de todas las capas
- **Último costo:** Costo de compra más reciente
- **Costo estándar:** Costo predefinido (manufacturing)

### 7.4 Trazabilidad de Seriales (Opcional)
- `products.is_serialized = true` para control individual
- Estados: `in_stock` | `allocated` | `sold` | `warranty` | `returned` | `scrapped`

### 7.5 Permisos (JSONB en user_roles)
```typescript
interface RolePermissions {
  canApplyDiscount: boolean;
  maxDiscountPercent: number;
  canApplyCustomPrice: boolean;
  canVoidSale: boolean;
  canRefundSale: boolean;
  canVoidInvoice: boolean;
  canAdjustStock: boolean;
  canViewReports: boolean;
  canExportReports: boolean;
  allowedWarehouseLocalIds?: string[];
}
```

### 7.6 Módulos y Flujos

**POS:**
- Carrito rápido, suspended sales, cierre de caja
- Descuentos por línea/total, pagos múltiples
- Bi-monetario: mostrar precios en Bs y USD

**Inventario:**
- Multi-bodega, tallas/colores
- Conteos de inventario con ajustes automáticos
- Reorden automático

**Producción (MRP Ligero):**
- Recipes (BOM) con ingredientes y rendimiento
- ProductionOrders con consumo real vs teórico

---

## 8. Cumplimiento Legal Venezuela

### 8.1 Taxpayer Info
```typescript
interface TaxpayerInfo {
  rif: string;
  razonSocial: string;
  direccionFiscal: string;
  regimenTributario: 'ordinario' | 'simplificado' | 'especial';
  responsabilidadIVA: 'contribuyente' | 'no_contribuyente';
  retenedorIVA: boolean;
  retenedorISLR: boolean;
}
```

### 8.2 Facturación SENIAT
**Tipos:** Electrónica (XML+JSON), Impresora Fiscal, Manual

### 8.3 Multimoneda
- Tabla historiada `exchange_rates`
- POS Bi-monetario: precios en Bs y USD
- Pagos mixtos (efectivo Bs + USD + transferencia)

### 8.4 IGTF (3%)
- Aplicar sobre pagos en divisas (USD, EUR, USDT)
- Afecta redondeo y monto total
- Generar retención en libros fiscales

---

## 9. Carga de Sesión y Bootstrap

**Flujo:**
1. Auth valida sesión
2. Trigger agrega `tenant_slug` al JWT
3. Resolver roles en `user_roles`
4. Si `super_admin` → Admin Panel
5. Si `owner/employee` → Resolver tenant
6. Cargar datos del tenant
7. Cargar plantillas según `business_type`
8. Iniciar sync
9. Verificar suscripción → App o BlockedAccessScreen

---

## 10. Eventos EventBus

### Catálogo
- `CATALOG.PRODUCT_CREATED` → { tenantId, localId, visible }
- `CATALOG.PRODUCT_UPDATED` → { tenantId, localId }
- `CATALOG.PRESENTATION_CREATED` → { tenantId, id, productLocalId }

### Ventas
- `SALE.COMPLETED` → { tenantId, localId, total, currency }
- `SALE.SUSPENDED` → { tenantId, localId }
- `SALE.SUSPENDED_RESTORED` → { tenantId, originalSuspendedLocalId, newSaleLocalId }
- `POS.BOX_OPENED` → { tenantId, localId, warehouseLocalId }
- `POS.BOX_CLOSED` → { tenantId, localId }

### Inventario
- `INVENTORY.STOCK_UPDATED` → { tenantId, productLocalId, warehouseLocalId, newQuantity }
- `INVENTORY.STOCK_MOVEMENT_RECORDED` → { tenantId, localId, productLocalId, warehouseLocalId, quantity, movementType }
- `INVENTORY.REORDER_EVALUATED` → { tenantId, suggestions }

### Producción
- `PRODUCTION.ORDER_CREATED` → { tenantId, localId }
- `PRODUCTION.STARTED` → { tenantId, localId }
- `PRODUCTION.COMPLETED` → { tenantId, localId, productionLogLocalId }

### Facturación
- `INVOICE.CREATED` → { tenantId, localId, total, currency }
- `INVOICE.VOIDED` → { tenantId, localId }
- `SALE.INVOICE_LINKED` → { tenantId, saleLocalId, invoiceLocalId }

### Compras
- `PURCHASES.PRODUCT_CREATE_REQUESTED` → { name, categoryId?, visible }
- `PURCHASE.CREATED` → { tenantId, localId }
- `PURCHASE.RECEIVED` → { tenantId, localId }

### Sincronización
- `SYNC.QUEUE_ITEM_ENQUEUED` → { itemId }
- `SYNC.STATUS_CHANGED` → { status }
- `SYNC.CONFLICT_DETECTED` → { itemId, table }
- `SYNC.RETRY_SCHEDULED` → { itemId, attempts, retryAfter }
- `SYNC.DLQ_ITEM_MOVED` → { itemId }

---

## 11. Estructura de Archivos

```
src/features/[modulo]/
├── index.ts                    # Exports públicos
├── types/[modulo].types.ts     # Interfaces
├── services/[modulo].service.ts # Lógica de negocio
├── hooks/use[Modulo].ts        # Coordinación UI
├── components/
│   ├── [Modulo]List.tsx
│   └── [Modulo]Form.tsx
└── test/[modulo].service.test.ts
```

### Nombres Estrictos

| Tipo | Patrón | Ejemplo |
|------|--------|---------|
| Servicio | `[modulo].service.ts` | `products.service.ts` |
| Tipos | `[modulo].types.ts` | `products.types.ts` |
| Hook | `use[Modulo].ts` | `useInventory.ts` |
| Componente | `[Modulo]List.tsx` | `ProductsList.tsx` |
| Evento | `MODULE.ACTION` | `SALE.COMPLETED` |

---

## 12. Contratos de Servicios

### Products
```typescript
interface ProductsService {
  createCategory(tenant, actor, input): Promise<Result<Category, AppError>>;
  createProduct(tenant, actor, input): Promise<Result<Product, AppError>>;
  createPresentation(tenant, actor, input): Promise<Result<ProductPresentation, AppError>>;
  listCategories(tenant): Promise<Result<Category[], AppError>>;
  listProducts(tenant): Promise<Result<Product[], AppError>>;
  updateCategory(tenant, actor, input): Promise<Result<Category, AppError>>;
  updateProduct(tenant, actor, input): Promise<Result<Product, AppError>>;
  deleteCategory(tenant, actor, categoryLocalId): Promise<Result<void, AppError>>;
  deleteProduct(tenant, actor, productLocalId): Promise<Result<void, AppError>>;
}
```

### Inventory
```typescript
interface InventoryService {
  createWarehouse(tenant, actor, input): Promise<Result<Warehouse, AppError>>;
  listWarehouses(tenant): Promise<Result<Warehouse[], AppError>>;
  createProductSizeColor(tenant, actor, input): Promise<Result<ProductSizeColor, AppError>>;
  recordStockMovement(tenant, actor, input): Promise<Result<StockMovement, AppError>>;
  getStockBalance(tenant, productLocalId, warehouseLocalId): Promise<Result<number, AppError>>;
  createInventoryCount(tenant, actor, input): Promise<Result<InventoryCount, AppError>>;
  postInventoryCount(tenant, actor, inventoryCountLocalId): Promise<Result<InventoryCount, AppError>>;
  getReorderSuggestions(tenant, actor, options?): Promise<Result<ReorderSuggestion[], AppError>>;
}
```

### Sales
```typescript
interface SalesService {
  createSuspendedSale(tenant, actor, input): Promise<Result<SuspendedSale, AppError>>;
  createPosSale(tenant, actor, input): Promise<Result<Sale, AppError>>;
  restoreSuspendedSale(tenant, actor, suspendedLocalId): Promise<Result<RestoreSuspendedSaleResult, AppError>>;
  openBox(tenant, actor, input): Promise<Result<BoxClosing, AppError>>;
  closeBox(tenant, actor, input): Promise<Result<BoxClosing, AppError>>;
  listSales(tenant): Promise<Result<Sale[], AppError>>;
}
```

### Production
```typescript
interface ProductionService {
  createRecipe(tenant, actor, input): Promise<Result<Recipe, AppError>>;
  createProductionOrder(tenant, actor, input): Promise<Result<ProductionOrder, AppError>>;
  startProductionOrder(tenant, actor, productionOrderLocalId): Promise<Result<ProductionOrder, AppError>>;
  completeProductionOrder(tenant, actor, productionOrderLocalId): Promise<Result<ProductionLog, AppError>>;
  listRecipes(tenant): Promise<Result<Recipe[], AppError>>;
  listProductionOrders(tenant): Promise<Result<ProductionOrder[], AppError>>;
}
```

### Invoicing
```typescript
interface InvoicingService {
  createInvoice(tenant, actor, input): Promise<Result<Invoice, AppError>>;
  voidInvoice(tenant, actor, invoiceLocalId): Promise<Result<Invoice, AppError>>;
  listInvoices(tenant): Promise<Result<Invoice[], AppError>>;
  listTaxRules(tenant): Promise<Result<TaxRule[], AppError>>;
  listExchangeRates(tenant): Promise<Result<ExchangeRate[], AppError>>;
}
```

### Tenant
```typescript
interface TenantService {
  resolveTenantContext(userId: string): Promise<Result<TenantContext, AppError>>;
  resolveUserRole(userId: string): Promise<Result<UserRole, AppError>>;
  checkSubscription(tenantSlug: string): Promise<Result<boolean, AppError>>;
  bootstrapTenant(userId: string): Promise<Result<TenantBootstrapResult, AppError>>;
}
```

### Auth
```typescript
interface AuthService {
  getActiveSession(): Promise<Result<AuthSession, AppError>>;
  signOut(): Promise<Result<void, AppError>>;
}
```

### Relations (Compartido)
```typescript
interface RelationsService {
  createSalesCommission(tenantSlug, input): Promise<Result<SalesCommission, AppError>>;
  listSalesCommissions(tenantSlug): Promise<Result<SalesCommission[], AppError>>;
  createProductPreferredSupplier(tenantSlug, input): Promise<Result<ProductPreferredSupplier, AppError>>;
  createCustomerCreditLimit(tenantSlug, input): Promise<Result<CustomerCreditLimit, AppError>>;
}
```

---

## 13. Testing

### 13.1 Tests Obligatorios
- `npm run lint` | `npm run test` | `npm run build`
- **Facturación:** test redondeo SENIAT (céntimos exactos)
- **Inventario:** test stock negativo prohibido

### 13.2 Patrones de Testing

**Servicios:** mockear TODAS las dependencias (db, syncEngine, eventBus, supabase)
- Verificar ambos casos: ok() y err()
- Usar `vi.fn()` para spy en llamadas

**Hooks:** usar `@testing-library/react` con `renderHook`
- Probar estado inicial y transiciones

**Integración:** verificar orden de llamadas y emisión de eventos
- Orden: validar → preparar → encolar → commit → eventos

---

## 14. Errores Estructurados

**Códigos:** `{MÓDULO}_{ENTIDAD}_{ACCIÓN}_{CONDICIÓN}`
- `PRODUCT_CREATION_FORBIDDEN`, `STOCK_NEGATIVE_FORBIDDEN`

**Mensajes:**
- En español, claros, enfocados en acción correctiva
- NO exponer detalles internos o stack traces
- Ejemplo correcto: "El usuario no tiene permisos para gestionar productos"

**Propiedad retryable:**
- `true`: errores transitorios (red, timeouts, sync)
- `false`: validaciones, permisos

---

## 15. Patrones de Eventos

- Nomenclatura: `MODULO.ACCION` (MAYÚSCULAS, punto)
- Payload: siempre incluir `tenantId` y `localId`
- NO incluir datos sensibles (contraseñas, tokens)
- Consumidores: idempotentes, tolerantes a duplicados

---

## 16. Rendimiento

### 16.1 Optimización de Queries
- **USAR índices:** filtrar por `tenant_id`
- **EVITAR `SELECT *`:** especificar columnas
- **CONSIDERAR paginación:** LIMIT/OFFSET o cursor-based
- **EVITAR funciones en WHERE:** que impidan uso de índices

### 16.2 Eficiencia de SyncEngine
- AGRUPAR operaciones relacionadas
- EVITAR encolados idempotentes
- CONFIGURAR timeouts apropiados
- MONITOREAR cola

### 16.3 Límites Offline
| Recurso | Límite |
|---------|--------|
| Tamaño DB | 500MB - 1GB |
| Productos | 50,000/tenant |
| Sync/mes | 10,000 |

**Purge:**
- Transacciones > 6 meses
- Imágenes > 30 días
- Suspended sales > 7 días

---

## 17. Comparativa

| Característica | LogisCore | Valery | Odoo |
|----------------|-----------|--------|------|
| Arquitectura | Offline-first | Online | Online/on-premise |
| Multi-tenant | Sí | No | Enterprise |
| Facturación SENIAT | Sí | Sí | Custom |
| Multi-bodega | Sí | Sí | Sí |
| Producción/MRP | Sí | Sí | Sí |
| POS | Sí | Sí | Sí |
| Cierre caja | Sí | Sí | Sí |
| Costeo | FIFO/Prom/Estandar | FIFO/Prom | Múltiple |

---

## 18. Checklist Pre-PR

- [ ] Lógica en servicio, no componente
- [ ] Servicio retorna `Result<T, AppError>`
- [ ] No acceso directo a Supabase/Dexie desde componentes
- [ ] Dexie usa `tenantId = tenant.slug`
- [ ] No imports cruzados entre módulos (usar EventBus)
- [ ] Reglas fiscales de `tax_rules` (no hardcoded)
- [ ] Tests de redondeo fiscal pasando
- [ ] `npm run lint` pasa
- [ ] `npm run test` pasa
- [ ] `npm run build` pasa

---

## 19. Buenas Prácticas

1. **Documentación:** explicar el POR QUÉ, no el QUÉ
2. **Variables:** inglés técnico, concisas (`userInput`, `processingResult`)
3. **Archivos:** <200 líneas, una responsabilidad clara
4. **TDD:** test falliente → implementar → refactorizar
5. **CI:** siempre `lint && test && build` antes de commit

---

## 20. Guía para Nuevos Módulos

1. Definir tipos en `types/[modulo].types.ts`
2. Crear servicio con `Result<T, AppError>` en `services/[modulo].service.ts`
3. Crear hook de coordinación UI en `hooks/use[Modulo].ts`
4. Implementar componentes presentacionales en `components/`
5. Escribir tests unitarios en `test/[modulo].service.test.ts`
6. Exportar todo en `index.ts`
7. Documentar eventos emitidos/consumidos

**Referencia:** copiar y adaptar de módulos existentes (products, sales, inventory)
