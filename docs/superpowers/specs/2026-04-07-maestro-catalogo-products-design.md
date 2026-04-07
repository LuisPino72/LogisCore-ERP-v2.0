# Spec: Maestro de Catálogo - LogisCore ERP v2.0

> **Fecha**: 2026-04-07
> **Módulo**: Productos (Catálogo)
> **Versión**: 2.0
> **Status**: Aprobado para implementación

---

## 1. Visión General

El "Maestro de Catálogo" es un componente híbrido que combina la estructura funcional de un panel maestro con tabs (consistencia ERP) y un dashboard operativo visual. El sistema debe soportar negocios de alta densidad (hasta 50,000 productos) y negocios visuales (retail/ropa).

**Regla de Oro**: La creación de productos y categorías está centralizada en el flujo de Compras. Este módulo es de solo lectura/gestión para mantener integridad del inventario.

---

## 2. Estructura de Componentes

```
ProductsCatalog (contenedor principal)
├── KPIHeader (dashboard operativo)
├── Tabs (navegación principal)
│   ├── Tab "products": ProductsDataTable
│   ├── Tab "categories": CategoriesManager
│   ├── Tab "presentations": PresentationsManager
│   └── Tab "variants": SizeColorManager
├── FilterPanel (búsqueda y filtros)
└── Modales (Producto, Precio, Variantes)
```

---

## 3. Navegación por Tabs

### Pestañas Principales

| ID | Label | Icono | Propósito |
|----|-------|-------|-----------|
| `products` | "Todos los Productos" | Package | Lista maestra con filtros |
| `categories` | "Categorías" | Folder | Gestión jerárquica |
| `presentations` | "Presentaciones" | Scale | Unidades y conversiones |
| `variants` | "Variantes" | Shirt | Tallas/colores retail |

### Variante de Tabs
- Estilo: `pills` para mejor distinción visual
- Default: `products`

---

## 4. KPI Header (Dashboard Operativo)

### Métricas

| Métrica | Descripción | Fuente |
|---------|-------------|--------|
| **Total SKUs** | Conteo de productos activos (sin deletedAt) | products table |
| **Categorías Activas** | Conteo de categorías sin deletedAt | categories table |
| **Gravables (IVA 16%)** | Conteo where is_taxable = true | products table |
| **Productos Globales (Seed)** | Productos injected por Edge Function | preferredSupplierLocalId = null |

### Diseño Visual
- 4 columnas con cards `stat-card`
- Fondo gradiente sutil (white → surface-50)
- Hover con transición y border-color brand

---

## 5. Tab: Todos los Productos

### DataTable - Columnas

| Columna | Key | Ancho | Ordenable | Notas |
|---------|-----|-------|-----------|-------|
| SKU | `sku` | 120px | ✓ | Código único |
| Producto | `name` | flex | ✓ | Búsqueda por nombre |
| Categoría | `categoryName` | 150px | - | Join con categories |
| Unidad | `unitOfMeasure` | 80px | - | Badge: unidad/kg/lt/m |
| Precio USD | `price` | 100px | ✓ | Precio base presentación |
| Precio Bs | `priceBs` | 120px | - | Calculado con tasa activa |
| Acciones | `actions` | 100px | - | Editar, Precio, Eliminar |

### Badges (columnaFlags)

```
┌────────────┐ ┌────────────┐ ┌────────────┐
│ GRAVABLE   │ │  PESABLE   │ │  VISIBLE   │
│ (is_taxable)│ │(is_weighted)│ │ (visible)  │
└────────────┘ └────────────┘ └────────────┘
```

- **Gravable**: `badge-success` (verde) con texto "IVA"
- **Pesable**: `badge-info` (azul) + icono Scale
- **Visible**: `badge-brand` (amarillo) + icono Eye

### Filtros

| Campo | Tipo | Opciones |
|-------|------|---------|
| Búsqueda | text | SKU o nombre |
| Categoría | select | Lista de categorías activas |
| Visibilidad | select | Todos / Visible / Oculto |
| Fiscal | select | Todos / Gravable / No gravable |

### Precisión Decimal
- Si `is_weighted = true`: usar `toFixed(4)` (ej: 1.2345 kg)
- Si `is_weighted = false`: usar `toFixed(2)`

---

## 6. Tab: Categorías

### Estructura
- Lista simple de categorías
- Columnas: Nombre, # Productos, Acciones
- Modal para crear/editar categoría
- Validación: No eliminar si tiene productos asociados

---

## 7. Tab: Presentaciones

### Estructura
- Tabla de presentaciones con join a productos
- Columnas: Presentación, Producto padre, Factor, Precio USD, Precio Bs

### Diseño de Tabla

| Columna | Key | Notas |
|---------|-----|-------|
| Presentación | `name` | |
| Producto | `productName` | Join con products |
| Factor | `factor` | Multiplicador |
| Precio USD | `price` | |
| Precio Bs | `priceBs` | Calculado |

---

## 8. Tab: Variantes (Talla/Color)

### Estructura
- Lista de variantes por producto
- Columnas: Producto, Talla, Color, SKU suffixes, Acciones

### Diseño de Tabla

| Columna | Key | Notas |
|---------|-----|-------|
| Producto | `productName` | Join con products |
| Talla | `size` | Nullable |
| Color | `color` | Nullable |
| SKU Suffix | `skuSuffix` | |
| Código | `barcode` | Nullable |

---

## 9. Modales de Edición

### Modal 1: Editar Producto

**Agrupación Visual:**
```
┌──────────────────────────┬──────────────────────────────┐
│ INFO GENERAL             │ CONFIGURACIÓN FISCAL        │
│ - Nombre                 │ - ☑ Gravable (IVA 16%)     │
│ - SKU                    │ - ☐ Pesable (báscula)       │
│ - Descripción            │ - ☐ Visible en POS         │
│ - Categoría (dropdown)  │                             │
├──────────────────────────┼──────────────────────────────┤
│ ATRIBUTOS TÉCNICOS       │ UNIDAD DE MEDIDA            │
│ - Peso (kg)              │ - ( ) Unidad  ( ) kg       │
│ - Largo (cm)             │ - ( ) Lt     ( ) m         │
│ - Ancho (cm)             │                             │
│ - Alto (cm)              │                             │
└──────────────────────────┴──────────────────────────────┘
```

### Modal 2: Gestión de Precios

**Diseño:**
```
┌─────────────────────────────────────────┐
│ PRODUCTO: {name}                        │
│ Presentación por defecto: {default}    │
├─────────────────────────────────────────┤
│ Presentación │ Factor │ Precio USD     │
│ Unidad       │   1    │ [________]     │
│ Caja (6 u)  │   6    │ [________]     │
│ Sack (24 u) │  24    │ [________]      │
├─────────────────────────────────────────┤
│ Tasa: {rate} Bs/USD                     │
└─────────────────────────────────────────┘
```

### Modal 3: Crear Producto con Variantes

**Flujo de generación visual:**
1. Ingresar producto base (nombre, SKU, categoría)
2. Agregar presentaciones (nombre, factor, precio)
3. Ingresar tallas: [S] [M] [L] [XL] [+ agregar]
4. Ingresar colores: [Rojo] [Azul] [Verde] [+ agregar]
5. Click "Generar" → matriz visual de variantes
6. Validar que cada variante tenga size O color

---

## 10. Validaciones Técnicas

### Regla de Variantes
```typescript
// Cada variante debe tener al menos size O color
if (!variant.size && !variant.color) {
  return error("Cada variante debe tener al menos talla o color");
}
```

### Precisión Decimal
```typescript
const formatQty = (value: number, isWeighted: boolean): string => {
  return isWeighted ? value.toFixed(4) : value.toFixed(2);
};
```

### Unidades de Medida Soportadas
- `unidad` (base)
- `kg` (kilogramos)
- `lt` (litros)
- `m` (metros)

---

## 11. Servicios y Métodos

### products.service.ts

| Método | Propósito |
|--------|-----------|
| `createProduct()` | Crear producto simple |
| `createProductWithVariants()` | Crear producto + presentaciones + tallas/colores |
| `listProducts()` | Listar productos |
| `listCategories()` | Listar categorías |
| `listPresentations()` | Listar presentaciones |
| `listProductSizeColors()` | Listar variantes |
| `updateProduct()` | Actualizar producto |
| `deleteProduct()` | Soft delete |

---

## 12. Deudas Técnicas Resueltas

| # | Deuda | Solución |
|---|-------|----------|
| #5 | Soporte productos pesables en POS | Campo `is_weighted` + toFixed(4) |
| #7 | Creación masiva de variantes | `createProductWithVariants()` |
| - | Consistencia fiscal SENIAT | Campo `is_taxable` para IVA 16% |

---

## 13. Estética Visual

### Tokens Tailwind a usar
- Card: `rounded-xl shadow-sm`
- Botones: `btn-primary` (gradiente brand)
- Estados vacíos: `EmptyState` component
- Badges: Variantes predefinidas en `common/components/Badge.tsx`

### Iconos (Lucide React)
- Package (productos)
- Folder (categorías)
- Scale (presentaciones)
- Shirt (variantes)
- Eye (visible)
- Scale (pesable)
- Receipt (gravable)

---

## 14. Criterios de Éxito

- [ ] KPI Header muestra 4 métricas correctas
- [ ] DataTable carga productos con paginación/virtualización
- [ ] Filtros por categoría, visibilidad, fiscal funcionan
- [ ] Badges identifican correctamente is_taxable, is_weighted, visible
- [ ] Modal editar producto agrupa info general, fiscal, atributos
- [ ] Modal precios muestra referencia en Bs con tasa activa
- [ ] Modal variantes genera matriz visual tallas × colores
- [ ] toFixed(4) aplica solo a productos pesables
- [ ] Navegación por tabs es fluida
- [ ] `npm run build` pasa sin errores
