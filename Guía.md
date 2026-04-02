# LogisCore ERP - Guía de Desarrollo

> Fuente de verdad operativa del proyecto. Si la implementación, el reporte y esta guía no coinciden, se debe corregir la implementación o actualizar esta guía en el mismo bloque de trabajo.

---

## 1. Objetivo y Prioridades Técnicas

LogisCore ERP es un ERP ligero multi-tenant, offline-first. Prioridad técnica:

1. Aislamiento estricto por tenant
2. Operación estable offline y con sincronización segura
3. Lógica de negocio consistente en ventas, compras, inventario, producción y facturación
4. Frontend limpio, servicios claros y backend endurecido

---

## 2. Stack

- **Frontend:** React 19, Vite, TypeScript strict, Tailwind 4
- **Estado:** Zustand
- **Offline local:** Dexie
- **Backend:** Supabase Auth, Postgres, RLS, Edge Functions
- **Sincronización:** `SyncEngine`
- **Testing:** Vitest

---

## 3. Reglas Canónicas de Identificadores (CRÍTICAS)

| Campo         | Donde vive | Tipo   | Regla                                  |
| ------------- | ---------- | ------ | -------------------------------------- |
| `tenant_id`   | Supabase   | uuid   | FK real del tenant                     |
| `tenant_slug` | Supabase   | text   | Filtro legible por tenant              |
| `tenantId`    | Dexie      | text   | **SIEMPRE guarda el slug, nunca UUID** |
| `local_id`    | Supabase   | uuid   | ID generado en cliente                 |
| `localId`     | Dexie      | string | Mismo valor que `local_id`             |

**Reglas de uso:**

- En cliente: Dexie se filtra por `tenantId = tenant.slug`
- En frontend: Supabase se filtra por `tenant_slug` cuando aplica al modelo sincronizado
- Para operaciones admin/auth: usar `tenant.id` solo cuando el backend/Edge Function lo requiera
- **NUNCA mezclar UUID y slug en nuevos writes a Dexie**

---

## 4. Arquitectura Obligatoria

### 4.1 Capa de Servicios (REGLA DE ORO)

```
componente React → hook opcional → servicio → Dexie / SyncEngine / Supabase
```

- **PROHIBIDO** acceder directo a Supabase o Dexie desde componentes
- Los hooks de datos **NO deben** contener lógica de persistencia remota o local

### 4.2 Manejo de Errores

Toda función async de servicio **DEBE** retornar `Result<T, AppError>`

### 4.3 Responsabilidad por Capa

- `components/`: UI y eventos únicamente
- `hooks/`: coordinación de estado de UI
- `services/`: lógica de negocio, validación, persistencia, sync
- `types/`: contratos del módulo
- `test/`: pruebas del módulo

**Inyección de dependencias (para testing):**
Los servicios deben recibir `db` y `syncEngine` como dependencias al inicializar.

**Comunicación entre módulos (CONTRATO OBLIGATORIO):**
- **PROHIBIDO:** Importar servicios de un módulo a otro
- **OBLIGATORIO:** Usar EventBus para comunicación cruzada
- **Prefijo de eventos:** `MODULE.ACTION` (ej: `INVENTORY.STOCK_UPDATED`, `SALE.COMPLETED`)

### 4.4 Operaciones Sensibles (NUNCA desde cliente con privilegios)

- Creación de owners, Alta de empleados, Cambio de permisos, Eliminación lógica
- **Todas resueltas via Edge Functions**

---

## 5. Offline-first y Sincronización

### 5.1 Orden Obligatorio (NO MODIFICAR)

1. Validar
2. Preparar payload y `localId`
3. Encolar sync antes del commit local cuando el flujo lo requiera
4. Persistir en Dexie
5. Emitir eventos de UI

**PROHIBIDO:** llamadas remotas o encolado tardío dentro de transacción Dexie

### 5.2 Transacciones Dexie

- Un solo commit local por operación
- No anidar transacciones de servicios entre sí
- Preparar movimientos y datos antes del commit

### 5.3 SyncEngine Responsabilidades

- Cola offline, retry, conflictos, circuito de fallos
- **Dead Letter Queue:** Si un item falla 5 veces, se mueve a tabla `sync_errors`
- **Estrategia de resolución de conflictos por tabla:**

| Tipo de tabla | Estrategia | Acción en conflicto |
|--------------|------------|---------------------|
| Catálogo (products, categories) | Last Write Wins | Sobrescribir automáticamente |
| Transaccional (sales, stock_movements) | **NUNCA sobrescribir** | Marcar como `sync_error` |
| Configuración | Last Write Wins | Sobrescribir con validación |

### 5.4 Tablas Sincronizadas (desde cliente)

**Sincronizan:**
products, categories, sales, purchases, recipes, production_logs, suppliers, customers, invoices, invoice_settings, movements, taxpayer_info, security_audit_log, suspended_sales, stock_movements, **warehouses**, **product_size_colors**, **inventory_counts**, **production_orders**, **box_closings**, **tax_rules**, **exchange_rates**

**NO sincronizan:**
user_roles, subscriptions, business_types, invoice_items, inventory_lots, product_presentations

### 5.5 Tipos de Negocio y Plantillas

Los super admins gestionan tipos de negocio con categorías, productos e imágenes predefinidas que se cargan automáticamente al seleccionar el tipo.

### 5.6 Edge Function `sync_table_item`

Debe validar: tabla permitida, operación, payload, `local_id`, `tenant_uuid`, `tenant_slug`, JWT válido.

### 5.7 Relaciones entre Tablas y Flujo de Datos (CRÍTICA)

#### 5.7.1 Estructura Multi-tenant Central

Todas las tablas de negocio tienen `tenant_id` (UUID) → `tenants.id`.

#### 5.7.2 Relaciones Clave

**Productos y Categorías:**
- `products.category_id` → `categories.local_id`
- `products.default_presentation_id` → `product_presentations.id`

**Inventario y Movimientos:**
- `stock_movements.product_id` → `products.local_id`
- `inventory_lots.product_id` → `products.id`

**Producción y Recetas:**
- `recipes.product_id` → `products.local_id`
- `production_logs.recipe_id` → `recipes.local_id`
- `recipes.ingredients` y `production_logs.ingredients_used` son JSONB

**Ventas y Facturación:**
- `sales.customer_id` → `customers.id`
- `invoices.customer_id` → `customers.id`
- `invoices.sale_id` → `sales.local_id`
- **Facturación híbrida:** En Dexie los ítems están embebidos en `invoices.items` (JSONB). El sync los transforma a tabla `invoice_items` en servidor.

**Patrón de FKs:**
- Tablas sincronizadas → usan `local_id`
- Tablas server-side o estáticas → usan `id` (UUID)

---

## 6. Seguridad y Multi-tenant

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

**⚠️ Custom Claims JWT (IMPORTANTE):**
Crear trigger para agregar `tenant_slug` al JWT:

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

### 6.2 Auditoría de Seguridad

Eventos sensibles deben registrar: `eventType`, `userId`, `tenantId`, `ipAddress`, `userAgent`, `success`

---

## 7. Reglas de Negocio Críticas

### 7.1 Inventario y Contabilidad

Toda venta, compra o producción que afecte stock debe registrar `stock_movements`.

### 7.2 Borrados e Integridad Referencial

Siempre usar chequeos de integridad antes de borrar entidades con referencias.

### 7.3 Facturación

**Reglas invariables:**
- Backend usa `invoices` + `invoice_items` (relación 1:N)
- Carga remota debe hidratar líneas reales
- Anulación de factura con venta asociada debe resolver primero la venta

**Modelo local (híbrido):**
- **Mantener** `items` embebidos en `Invoice` local (Dexie)
- El sync transforma a tabla separada en servidor

**Cálculo de Impuestos y Redondeo (SENIAT):**
- **Regla de céntimos legales:** El total de la factura no puede diferir de la suma de las líneas por más de 0.01 Bs
- **Tasas de IVA:** Leer de tabla `tax_rules` sincronizada, **NUNCA hardcodear**
- **Retenciones:** IVA 75%, ISLR según tabla SENIAT vigente

### 7.4 Suscripciones

**Sistema server-side:** `subscriptions`, `subscription_notifications`, Edge Function `check-subscriptions`

**Contrato de datos vigente:**
- `subscriptions` referencia tenant por `tenant_id` (UUID), no por `tenant_slug`.
- Desde cliente, la verificación debe hacerse por RPC/Edge `check_subscriptions(p_tenant_slug)`; si se usa fallback SQL, primero resolver `tenants.id` por `slug` y luego filtrar `subscriptions.tenant_id`.

**Regla de UI:** Si suscripción no está activa, bloquear acceso con `BlockedAccessScreen`

### 7.5 Gestión de Productos y Presentaciones

**Modelo:** Cada producto puede tener presentaciones (variantes vendibles), stock en unidad base.

**Flujo de creación (INVARIABLE):**
- **Compras** es módulo principal para crear productos, categorías y proveedores
- **Inventario** es solo visualización y ajustes de stock, **NO crea productos**

**Visibilidad:**
- `visible`: aparece en módulo Ventas y POS
- `defaultPresentationId`: presentación por defecto al agregar al carrito

### 7.6 Sistema de Costeo y Trazabilidad

**Trazabilidad de Seriales (Opcional por Producto):**
- `track_serials = true` para control individual de unidades serializadas
- Estados: `in_stock` | `allocated` | `sold` | `warranty` | `returned` | `scrapped`

**Motor de Costeo:**
- **FIFO:** Costo de las unidades más antiguas
- **Promedio ponderado:** Costo medio de todas las capas
- **Último costo:** Costo de la compra más reciente
- **Costo estándar:** Costo predefinido (presupuestado) - para manufacturing

### 7.7 Módulos y Flujos de Negocio (Valery-style + Odoo)

#### 7.7.1 POS (Punto de Venta)
- Carrito rápido, suspended sales, cierre de caja diario
- Modo touchscreen, búsqueda por código/nombre
- Descuentos por línea/total, pagos múltiples

#### 7.7.2 Inventario Avanzado
- **Multi-bodega:** `warehouses` con permisos por bodega
- **Tallas/Colores:** `product_size_colors` opcional por producto
- **Reorden automático:** reglas por producto/warehouse

#### 7.7.3 Compras y Recepciones
- Purchase → Receiving → Stock → Lotes/Seriales

#### 7.7.4 Producción (MRP Ligero)
- Recipes (BOM) con ingredientes y rendimiento
- ProductionOrders con consumo real vs teórico

#### 7.7.5 Reportes
- Ventas por vendedor/producto/día
- Valor de inventario (FIFO/promedio)
- Utilidad bruta, Kardex, Cierre de caja

### 7.8 Permisología Granular (JSONB en user_roles)

```typescript
interface RolePermissions {
  canApplyDiscount: boolean;
  maxDiscountPercent: number;
  canApplyCustomPrice: boolean;
  canVoidSale: boolean;
  canRefundSale: boolean;
  canVoidInvoice: boolean;
  canAdjustStock: boolean;
  // ... más permisos
}
```

**Instrucción:** Todos los servicios que realizan acciones sensibles deben validar permisos usando el objeto `permissions` del user_roles.

---

## 8. Cumplimiento Legal y Fiscal Venezuela (SENIAT)

### 8.1 Taxpayer Info Ampliado

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

**Flujo:** Generar Invoice → Calcular Impuestos → Generar Documento → Almacenar local → Evento secundario (stock)

### 8.3 Multimoneda y Tasas de Cambio

**Tabla historiada:**
```sql
CREATE TABLE public.exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  from_currency VARCHAR(3),
  to_currency VARCHAR(3),
  rate NUMERIC(20,6),
  source VARCHAR(50),
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ
);
```

**POS Bi-monetario:**
- Mostrar precios en Bs y USD simultáneamente
- Recalcular carrito si cambia la tasa
- Pagos mixtos (efectivo Bs + USD + transferencia)

### 8.4 IGTF (3%)

- Aplicar sobre pagos en divisas (USD, EUR, USDT)
- Afecta redondeo y monto total
- Generar retención en libros fiscales

---

## 9. Carga de Sesión y Bootstrap

**Flujo esperado:**

1. Auth valida sesión
2. Trigger agrega `tenant_slug` al JWT
3. Resolver roles en `user_roles`
4. Si `super_admin` → Admin Panel
5. Si `owner/employee` → Resolver tenant
6. Cargar datos del tenant
7. Cargar plantillas según `business_type` (tallas/colores, warehouses, recetas)
8. Iniciar sync
9. Verificar suscripción

**Reglas:**
- No usar hooks que hablen directo con Supabase o Dexie
- `useTenantData` solo coordina UI; la carga real vive en servicio

---

## 10. Frontend y UX Técnica

- **Notificaciones:** Usar `ToastProvider` / `useToast`. **NUNCA** usar `alert()`
- **Code Splitting:** Módulos no críticos con `lazy()`
- **React:** Efectos con dependencias correctas, callbacks estables

---

## 11. Testing Mínimo Esperado

Cada cambio relevante debe dejar:
- `npm run lint` en verde
- `npm run test` en verde
- `npm run build` en verde

### 11.1 Tests Obligatorios por Módulo

**Facturación (CRÍTICO):**
- Test cálculo IVA con céntimos exactos (redondeo SENIAT)
- Test ajuste de redondeo cuando suma líneas ≠ total
- Test tasas desde tabla tax_rules (no hardcoded)

**Sincronización:**
- Test offline → conflicto → resolución por tipo de tabla
- Test Dead Letter Queue (fallo 5 veces → sync_errors)

**Inventario:**
- Test stock negativo prohibido
- Test integridad referencial
- Test consumo de serials en venta

---

## 12. Convenciones de Código y Estructura de Archivos

### 12.1 Estructura por Módulo

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

### 12.2 Nombres Estrictos

| Tipo | Patrón | Ejemplo |
|------|--------|---------|
| Servicio | `[modulo].service.ts` | `products.service.ts` |
| Tipos | `[modulo].types.ts` | `products.types.ts` |
| Hook | `use[Modulo].ts` | `useInventory.ts` |
| Componente | `[Modulo]List.tsx` | `ProductsList.tsx` |
| Evento | `MODULE.ACTION` | `SALE.COMPLETED` |

### 12.3 Exports Obligatorios

Cada `index.ts` debe exportar tipos, servicios, hooks y componentes.

---

## 13. Diagramas de Arquitectura

### 13.1 Arquitectura General

```
┌────────────────────────────────────────────┐
│           CLIENTE (React)                  │
├────────────────────────────────────────────┤
│  Componentes → Hooks → Servicios → Stores │
│         │                │                 │
│         ▼                ▼                 │
│   ┌─────────────┐   ┌─────────────┐        │
│   │   Dexie     │   │ SyncEngine  │        │
│   │ (offline)   │   │ (cola sync) │        │
│   └──────┬──────┘   └──────┬──────┘        │
└──────────┼────────────────┼────────────────┘
           │                │
           ▼                ▼
┌──────────────────┐ ┌──────────────────────┐
│ Supabase Client  │ │   Edge Functions     │
│  (solo lectura)  │ │  (writes seguros)    │
└────────┬─────────┘ └──────────┬───────────┘
         │                     │
         ▼                     ▼
    POSTGRES + RLS + Supabase Auth
```

### 13.2 Flujo POS Completo

```
Abrir Ticket → Agregar Productos → Cliente (opcional)
       ↓
Método de Pago → Finalizar Venta → Sale + Encolar Sync + Commit Dexie
       ↓
Stock Movements (disminuir stock, consumir serials)
       ↓
¿Factura? → Invoice + Calcular IVA + JSON SENIAT → Impresión
       ↓
Eventos UI (Inventory_Updated, Sale_Created)
```

### 13.3 Compra → Recepción

```
Crear Purchase → Receiving → Actualizar Stock
       ↓
Lotes/Seriales → products.cost → SyncEngine
```

### 13.4 Producción (MRP)

```
Crear Recipe → ProductionOrder → Validar stock
       ↓
Consumir Ingredientes → Completar → Variación costo
       ↓
SyncEngine
```

### 13.5 Sesión y Bootstrap

```
Auth → JWT con tenant_slug (trigger)
user_roles → acceso
Resolver tenant
Cargar datos + plantillas business_type
SyncEngine.startPeriodicSync()
check-subscription → App o BlockedAccessScreen
```

---

## 14. Base de Datos y Backend

### 14.1 Tipos de Datos Obligatorios

| Concepto | Tipo Postgres | Regla |
|----------|---------------|-------|
| Dinero | `NUMERIC(19,4)` | **NUNCA** FLOAT/REAL |
| ID (servidor) | `UUID` | gen_random_uuid() |
| ID (cliente) | `UUID` | crypto.randomUUID() |
| Fechas | `TIMESTAMPTZ` | UTC en DB |
| Banderas | `BOOLEAN` | Default FALSE |
| Borrado lógico | `TIMESTAMPTZ` | deleted_at NULL=activo |

### 14.2 Convenciones de Nombres

- Tablas: `snake_case`, plural (`stock_movements`)
- Columnas: `snake_case` (`created_at`, `tenant_id`)
- Índices: `idx_[tabla]_[columna]` (`idx_products_tenant_id`)
- FK: `fk_[tabla]_[ref]` (`fk_sales_customer_id`)

### 14.3 Índices Obligatorios

```sql
CREATE INDEX idx_[tabla]_tenant_id ON public.[tabla](tenant_id);
CREATE INDEX idx_[tabla]_created_at ON public.[tabla](created_at DESC);
CREATE INDEX idx_[tabla]_tenant_created ON public.[tabla](tenant_id, created_at DESC);
```

### 14.4 Contratos de Edge Functions

**Entrada con Zod:**
```typescript
const InputSchema = z.object({
  table: z.enum(['products', 'categories', 'sales']),
  operation: z.enum(['create', 'update', 'delete']),
  data: z.record(z.unknown()),
  localId: z.string().uuid(),
});
```

**Reglas:**
1. Validar JWT: `supabase.auth.getUser()`
2. Extraer `user_id` y `tenant_slug` del token claims
3. **NUNCA** confiar en tenant_id del body
4. Rate limiting obligatorio

### 14.5 Inventario de Tablas

| Tabla | local_id | Sincroniza | Notas |
|-------|----------|------------|-------|
| tenants | No | - | Núcleo |
| products | Sí | ✓ | |
| categories | Sí | ✓ | |
| sales, purchases | Sí | ✓ | |
| invoices | Sí | ✓ | items embebidos local |
| stock_movements | Sí | ✓ | |
| recipes, production_logs | Sí | ✓ | |
| warehouses | Sí | ✓ (plan) | Multi-bodega |
| product_size_colors | Sí | ✓ (plan) | Tallas/colores |
| tax_rules | Sí | ✓ | Tasas dinámicas |
| exchange_rates | Sí | ✓ | Historiado BCV |
| user_roles | No | - | JSONB permisos |

### 14.6 Triggers y Lógica de Servidor

**Regla de Oro:** Mínima lógica en Base de Datos.

**✅ Permitido:** updated_at, audit_logs, validaciones críticas de stock
**❌ Prohibido:** Cálculos de negocio (subtotales, IVA), lógica de sync

---

## 15. Extensibilidad (Fase 2)

### 15.1 Añadir Nuevo Módulo

Estructura obligatoria según sección 12.1

**Checklist:**
- [ ] Definir tipos
- [ ] Crear servicio con `Result<T, AppError>`
- [ ] Usar Dexie con `tenantId = tenant.slug`
- [ ] Sincronizar via SyncEngine
- [ ] Añadir políticas RLS
- [ ] Tests unitarios

---

## 16. Performance y Límites Offline (Fase 2)

| Recurso | Límite |
|---------|--------|
| Tamaño DB | 500MB - 1GB |
| Productos | 50,000/tenant |
| Sync/mes | 10,000 |

**Purge:**
- Transacciones > 6 meses → purgar (conservar summary)
- Imágenes > 30 días → eliminar cache
- Suspended sales > 7 días → eliminar

---

## 17. Comparativa: LogisCore vs Valery vs Odoo

| Característica | LogisCore | Valery | Odoo |
|----------------|-----------|--------|------|
| Arquitectura | Offline-first | Online | Online/on-premise |
| Multi-tenant | Sí | No | Enterprise |
| Facturación SENIAT | Sí | Sí | Custom |
| Multi-bodega | Sí (plan) | Sí | Sí |
| Producción/MRP | Sí | Sí | Sí |
| POS | Sí | Sí | Sí |
| Cierre caja | Sí (plan) | Sí | Sí |
| Costeo | FIFO/Prom/Estandar | FIFO/Prom | Múltiple |

---

## 18. Checklist Pre-PR (OBLIGATORIO)

Antes de cualquier PR, verificar:

- [ ] La lógica vive en servicio, no en componente
- [ ] El servicio retorna `Result<T, AppError>`
- [ ] No hay acceso directo a Supabase o Dexie desde componentes
- [ ] Dexie usa `tenantId = tenant.slug`
- [ ] No hay imports cruzados entre módulos (usar EventBus)
- [ ] Reglas fiscales leídas de tax_rules (no hardcoded)
- [ ] Tests de redondeo fiscal pasando
- [ ] `npm run lint` pasa
- [ ] `npm run test` pasa
- [ ] `npm run build` pasa

---

## 19. Contratos de Servicios (Referencia Rápida)

### Auth
```typescript
interface AuthService {
  getActiveSession(): Promise<Result<AuthSession, AppError>>;
  signOut(): Promise<Result<void, AppError>>;
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
  getReorderSuggestions(tenant): Promise<Result<ReorderSuggestion[], AppError>>;
}
```

### Sales
```typescript
interface SalesService {
  createSuspendedSale(tenant, actor, input): Promise<Result<SuspendedSale, AppError>>;
  createPosSale(tenant, actor, input): Promise<Result<Sale, AppError>>;
  restoreSuspendedSale(tenant, actor, suspendedSaleLocalId): Promise<Result<RestoreSuspendedSaleResult, AppError>>;
  openBox(tenant, actor, input): Promise<Result<BoxClosing, AppError>>;
  closeBox(tenant, actor, boxClosingLocalId): Promise<Result<BoxClosing, AppError>>;
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

---

## 20. Eventos EventBus (Referencia)

### Catálogo
- `CATALOG.CATEGORY_CREATED` → { tenantId, localId }
- `CATALOG.CATEGORY_UPDATED` → { tenantId, localId }
- `CATALOG.CATEGORY_DELETED` → { tenantId, localId }
- `CATALOG.PRODUCT_CREATED` → { tenantId, localId, visible }
- `CATALOG.PRODUCT_UPDATED` → { tenantId, localId }
- `CATALOG.PRODUCT_DELETED` → { tenantId, localId }
- `CATALOG.PRESENTATION_CREATED` → { tenantId, id, productLocalId }

### Ventas
- `SALE.COMPLETED` → { tenantId, localId, total, currency }
- `SALE.SUSPENDED` → { tenantId, localId }
- `SALE.SUSPENDED_RESTORED` → { tenantId, originalSuspendedLocalId, newSaleLocalId }
- `POS.BOX_OPENED` → { tenantId, localId, warehouseLocalId }
- `POS.BOX_CLOSED` → { tenantId, localId }

### Inventario
- `INVENTORY.STOCK_UPDATED` → { tenantId, productLocalId, warehouseLocalId, newQuantity }
- `INVENTORY.REORDER_EVALUATED` → { tenantId, suggestions }
- `INVENTORY.REORDER_SUGGESTED` → { tenantId, suggestions }
- `INVENTORY.STOCK_MOVEMENT_RECORDED` → { tenantId, localId, productLocalId, warehouseLocalId, quantity, movementType }

### Producción
- `PRODUCTION.ORDER_CREATED` → { tenantId, localId }
- `PRODUCTION.STARTED` → { tenantId, localId }
- `PRODUCTION.COMPLETED` → { tenantId, localId, productionLogLocalId }

### Facturación
- `INVOICE.CREATED` → { tenantId, localId, total, currency }
- `INVOICE.VOIDED` → { tenantId, localId }
- `SALE.INVOICE_LINKED` → { tenantId, saleLocalId, invoiceLocalId }

### Compras
- `PURCHASES.CATEGORY_CREATE_REQUESTED` → { name }
- `PURCHASES.PRODUCT_CREATE_REQUESTED` → { name, categoryId?, visible, defaultPresentationId? }
- `PURCHASES.PRESENTATION_CREATE_REQUESTED` → { productLocalId, name, factor, barcode? }
- `PURCHASE.CREATED` → { tenantId, localId }
- `PURCHASE.RECEIVED` → { tenantId, localId }

### Autenticación y Tenant
- `TENANT.RESOLVED` → { tenantSlug }
- `SUBSCRIPTION.BLOCKED` → {}
- `AUTH.ROLE_DETECTED` → { userId, role, permissions }

### Sincronización
- `SYNC.QUEUE_ITEM_ENQUEUED` → { itemId }
- `SYNC.STATUS_CHANGED` → { status }
- `SYNC.CONFLICT_DETECTED` → { itemId, table }
- `SYNC.CATALOG_CONFLICT_LWW` → { itemId, table, retryAfter }
- `SYNC.RETRY_SCHEDULED` → { itemId, attempts, retryAfter }
- `SYNC.DLQ_ITEM_MOVED` → { itemId }

---

## 21. Permisos Centralizados

Los permisos se validan mediante `ActorContext` con la estructura:

```typescript
interface ActorPermissions {
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

type ActorRole = "owner" | "employee" | "super_admin";

interface ActorContext {
  role: ActorRole;
  permissions: ActorPermissions;
}
```

Los servicios de permisos están disponibles en `@/lib/permissions/permissions.types.ts`.

---

## 22. Patrones de Testing Avanzados

Tests de servicios: mockear TODAS las dependencias (db, syncEngine, eventBus, supabase)
- Verificar ambos casos: ok() y err() para cada método
- Proveer valores de retorno realistas para métodos mockeados
- Usar `vi.fn()` para spy en llamadas y verificar argumentos
- Tests deben ser determinísticos y aislados

Tests de hooks: usar `@testing-library/react` con `renderHook`
- Probar estado inicial y transiciones de estado
- Verificar llamadas a métodos del servicio mediante mocks
- Simular acciones de usuario y verificar efectos en el estado

Tests de integración: verificar el orden de llamadas y emisión correcta de eventos
- Confirmar que se sigue el orden: validar → preparar → encolar → commit → eventos
- Verificar que se emitan los eventos correctos con payload adecuado
- Probar flujos completos que involucren múltiples servicios mediante EventBus

---

## 23. Manejo de Errores Estructurado

Códigos de error: formato `{MÓDULO}_{ENTIDAD}_{ACCIÓN}_{CONDICIÓN}`
Ejemplos: `PRODUCT_CREATION_FORBIDDEN_MODULE`, `STOCK_NEGATIVE_FORBIDDEN`

Mensajes de error: en español, claros, enfocados en la acción correctiva
NO exponer detalles internos, stack traces o información de base de datos
Ejemplo correcto: "El usuario no tiene permisos para gestionar catalogo de productos."
Ejemplo incorrecto: "Error en línea 124: permission denied for user X"

Propiedad `retryable`: 
- `true`: errores transitorios (problemas de red, timeouts, conflictos de sincronización)
- `false`: errores de lógica de negocio, validación fallida, permisos insuficientes
- Siempre incluir en objetos `AppError` para permitir lógica de reinteligencia adecuada

---

## 24. Patrones de Eventos Refuerzo

Nomenclatura estricta: `MODULO.ACCION` (ambas en MAYÚSCULAS, punto como separador)
Ejemplos correctos: `SALE.COMPLETED`, `INVENTORY.STOCK_UPDATED`, `TENANT.RESOLVED`

Payload de eventos: incluir SIEMPRE los identificadores contextuales
- `tenantId` (slug) para aislamiento multi-tenant
- `localId` o identificador de negocio relevante cuando aplique
- Datos mínimos necesarios para que los suscriptores actúen
- NUNCA incluir datos sensibles (contraseñas, tokens, información financiera completa)

Consumidores de eventos: deben ser idempotentes y tolerantes a duplicados
- Verificar si ya procesaron un evento similar basado en identificadores
- Mantener estado interno solo cuando sea absolutamente necesario
- Preferir reaccionar a cambios de estado más que a eventos específicos

---

## 25. Seguridad Adicional

Validación de entrada: NUNCA confiar en datos recibidos del cliente
- Validar tipos, rangos, formatos y restricciones de negocio en SERVICIOS
- Los componentes y hooks pueden hacer validación básica de UX, pero la seguridad está en servicios
- Usar bibliotecas como Zod o Joi para validaciones complejas cuando sea necesario

Principio de mínimos privilegios: 
- Servicios deben recibir SOLO las dependencias estrictamente necesarias
- Evitar pasar objetos completos cuando se necesita solo una propiedad
- Los hooks de UI nunca deben tener acceso directo a capacidades de escritura

Sanitización de outputs: aunque menos crítica en este stack, considerar:
- Escapar datos que se muestren en HTML para prevenir XSS
- Validar URLs antes de redireccionar o hacer fetch
- Nunca insertar datos sin validar directamente en DOM mediante innerHTML

---

## 26. Directrices de Rendimiento

Optimización de queries Postgres:
- USAR índices: siempre filtrar por `tenant_id` en tablas sincronizadas
- EVITAR `SELECT *`: especificar columnas necesarias explícitamente
- CONSIDERAR paginación: usar `LIMIT` y `OFFSET` o cursor-based para listas grandes
- EVITAR funciones en WHERE: que impidan uso de índices (ej: `WHERE UPPER(name) = 'X'`)

Eficiencia de SyncEngine:
- AGRUPAR operaciones relacionadas: encolar múltiplos items en una operación cuando sea posible
- EVITAR encolados idempotentes: verificar si ya existe un item pendiente similar
- CONFIGURAR timeouts apropiados: balances entre respuesta rápida y reintentos suficientes
- MONITOREAR cola: alertar cuando la cantidad de items pendientes supere umbrales

---

## 27. Guía para Nuevos Módulos

Estructura obligatoria (sección 12.1):
1. Definir tipos en `types/[modulo].types.ts`
2. Crear servicio con `Result<T, AppError>` en `services/[modulo].service.ts`
3. Crear hook de coordinación UI en `hooks/use[Modulo].ts`
4. Implementar componentes presentacionales en `components/`
5. Escribir tests unitarios en `test/[modulo].service.test.ts`
6. Exportar todo en `index.ts`

Orden de implementación recomendado:
1. Tipos y servicio (lógica de negocio pura)
2. Tests del servicio (verificar comportamiento)
3. Hook y componentes (interfaz de usuario)
4. Tests de hook y componentes (interacción UI)
5. Integración en la aplicación principal (registro en App.tsx o routing)
6. Documentación de eventos emitidos/consumidos

Referencia a patrones existentes: copiar y adaptar de módulos similares existentes
- Servicio: seguir estructura de `products.service.ts` o `sales.service.ts`
- Hook: seguir estructura de `useProducts.ts` o `useSales.ts`
- Componentes: seguir patrones de listas y formularios existentes
- Tests: seguir estructura de `products.service.test.ts`

---

## 28. Manejo de Transacciones Complejas

Orquestación de servicios: NUNCA hacer llamadas directas entre servicios
- USAR EventBus para comunicación entre módulos
- Publicar eventos que representen hechos de negocio completados
- Otros servicios se suscriben y reaccionan según corresponda

Compensación de fallos: aprovechar el modelo offline-first
- El SyncEngine maneja reintentos automáticos y movimiento a DLQ
- Los servicios deben ser idempotentes o diseñados para manejar procesamiento duplicado
- Los eventos deben diseñarse para permitir procesamiento seguro múltiples veces

Consistencia eventual: aceptar que las operaciones pueden no ser inmediatas
- El flujo es: intención del usuario → validación local → encolado → sync remoto → confirmación
- La UI refleja el estado inmediato local, con indicadores de sincronización cuando corresponde
- Los conflictos se resuelven según estrategias definidas por tipo de tabla (LWW vs DLQ)

---

## 29. Documentación Interna

Comentarios en código: explicar el POR QUÉ, no el QUÉ
- Comentarios que describen la intención, decisiones de diseño, razones detrás de enfoques
- Evitar comentarios que simplemente repitan lo que el código ya dice claramente
- Mantener comentarios actualizados cuando cambie la lógica

Nombres de variables y funciones:
- Usar inglés técnico consistente con el resto del códigobase
- Funciones: verbos en infinitivo o forma imperativa clara (calculateTotal, validateInput)
- Variables: descriptivas pero concisas (userInput, processingResult, isValid)
- Constantes: UPPER_SNAKE_CASE para valores que nunca cambian

Estructura de archivos:
- Mantener archivos pequeños y enfocados (ideal: <200 líneas)
- Una responsabilidad clara por archivo o clase
- Agrupar funcionalidad relacionada, no capas técnicas (evitar carpeta "utils" genérica)
- Cuando un archivo crece demasiado, buscar oportunidades para dividir por responsabilidad

---

## 30. Buenas Prácticas de Desarrollo

Revisión de código antes de commit:
- Auto-revisar cambios enfocándose en lógica, no solo en sintaxis
- Verificar que se siguieran todos los patrones establecidos
- Confirmar que los tests nuevos cubren casos de uso reales y edge cases

Desarrollo dirigido por pruebas (TDD) cuando sea aplicable:
- Escribir test falliente antes de implementar funcionalidad
- Implementar lo mínimo necesario para hacer pasar el test
- Refactorizar para mejorar diseño manteniendo tests verdes
- Repetir ciclo

Integración continua: aprovechar el pipeline existente
- Siempre ejecutar `npm run lint && npm run test && npm run build` antes de commit
- Corregir inmediatamente cualquier fallo en el pipeline
- Mantener la rama principal siempre en estado desplegable

---
