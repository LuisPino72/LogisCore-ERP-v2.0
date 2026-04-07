# Plan de Implementación: Maestro de Catálogo - LogisCore ERP v2.0

> **Fecha**: 2026-04-07
> **Spec**: docs/superpowers/specs/2026-04-07-maestro-catalogo-products-design.md

---

## Fase 1: Estructura Base y KPI Header

### Tarea 1.1: Refactorizar ProductsCatalog.tsx
- **Archivo**: `apps/web/src/features/products/components/ProductsCatalog.tsx`
- **Acciones**:
  1. Importar componente `Tabs` de `@/common/components`
  2. Crear constante `TAB_ITEMS` con las 4 pestañas
  3. Reemplazar renderizado simple por estructura de tabs
  4. Mantener integración con eventBus para refresh automático

### Tarea 1.2: Crear KPIHeader Component
- **Nuevo archivo**: `apps/web/src/features/products/components/KPIHeader.tsx`
- **Acciones**:
  1. Crear componente que reciba props: products, categories
  2. Calcular métricas:
     - `totalSKUs`: products.filter(p => !p.deletedAt).length
     - `activeCategories`: categories.filter(c => !c.deletedAt).length
     - `taxableProducts`: products.filter(p => p.isTaxable).length
     - `seedProducts`: products.filter(p => !p.preferredSupplierLocalId).length
  3. Usar clases `stat-card` del CSS global
  4. Renderizar 4 cards en grid

---

## Fase 2: Tab - Todos los Productos (DataTable)

### Tarea 2.1: Crear ProductsDataTable Component
- **Nuevo archivo**: `apps/web/src/features/products/components/ProductsDataTable.tsx`
- **Acciones**:
  1. Importar `DataTable` de `@/common/components`
  2. Definir columnas con TableColumn type
  3. Implementar render para badges (is_taxable, is_weighted, visible)
  4. Implementar búsqueda por SKU y nombre
  5. Agregar filtros: categoría, visibilidad, fiscal

### Tarea 2.2: Crear FilterPanel para Productos
- **Nuevo archivo**: `apps/web/src/features/products/components/ProductsFilters.tsx`
- **Acciones**:
  1. Crear inputs de búsqueda (text)
  2. Crear selects para filtros
  3. Emitir eventos de cambio para actualizar estado

### Tarea 2.3: Actualizar ProductsList para usar DataTable
- **Archivo existente**: `apps/web/src/features/products/components/ProductsList.tsx`
- **Acciones**:
  1. Reemplazar estructura simple por ProductsDataTable
  2. Integrar filtros y badges

---

## Fase 3: Modales de Edición

### Tarea 3.1: Crear ProductEditModal
- **Nuevo archivo**: `apps/web/src/features/products/components/ProductEditModal.tsx`
- **Acciones**:
  1. Usar `Modal` de `@/common/components`
  2. Crear formulario agrupado (Info General, Fiscal, Atributos)
  3. Integrar con `updateProduct()` del servicio
  4. Validar campos requeridos

### Tarea 3.2: Crear PriceManagementModal
- **Nuevo archivo**: `apps/web/src/features/products/components/PriceManagementModal.tsx`
- **Acciones**:
  1. Recibir producto y sus presentaciones
  2. Mostrar tabla editable de precios USD
  3. Calcular y mostrar precio en Bs según tasa activa
  4. Integrar con `updatePresentation()` del servicio

### Tarea 3.3: Crear VariantGeneratorModal
- **Nuevo archivo**: `apps/web/src/features/products/components/VariantGeneratorModal.tsx`
- **Acciones**:
  1. Formulario para producto base
  2. Lista dinámica de presentaciones
  3. Inputs para tallas y colores con "agregar"
  4. Botón "Generar" que crea matriz visual
  5. Validación: cada variante debe tener size O color
  6. Integrar con `createProductWithVariants()` del servicio

---

## Fase 4: Vista de Categorías

### Tarea 4.1: Crear CategoriesManager
- **Nuevo archivo**: `apps/web/src/features/products/components/CategoriesManager.tsx`
- **Acciones**:
  1. Usar DataTable con columnas: Nombre, # Productos, Acciones
  2. Modal para crear/editar categoría
  3. Validación: no eliminar si tiene productos
  4. Integrar con `createCategory()`, `updateCategory()`, `deleteCategory()`

---

## Fase 5: Vista de Presentaciones

### Tarea 5.1: Crear PresentationsManager
- **Nuevo archivo**: `apps/web/src/features/products/components/PresentationsManager.tsx`
- **Acciones**:
  1. Tabla con join a productos
  2. Columnas: Presentación, Producto, Factor, Precio USD, Precio Bs
  3. Editar inline o modal

---

## Fase 6: Vista de Variantes

### Tarea 6.1: Crear SizeColorManager
- **Nuevo archivo**: `apps/web/src/features/products/components/SizeColorManager.tsx`
- **Acciones**:
  1. Tabla con join a productos
  2. Columnas: Producto, Talla, Color, SKU Suffix, Código
  3. Filtros por producto

---

## Fase 7: Utilidades y Helpers

### Tarea 7.1: Crear productos helpers
- **Nuevo archivo**: `apps/web/src/features/products/utils/products.utils.ts`
- **Acciones**:
  1. Función `formatQty(value, isWeighted)`: usa toFixed(4) o toFixed(2)
  2. Función `formatPrice(priceUsd, exchangeRate)`: retorna { usd, bs }
  3. Función `getCategoryName(categoryId, categories)`: lookup
  4. Const UNITS_OF_MEASURE = ['unidad', 'kg', 'lt', 'm']

---

## Fase 8: Integración y Testing

### Tarea 8.1: Integrar componentes en ProductsCatalog
- **Acciones**:
  1. Importar todos los componentes
  2. Conectar con el hook useProducts
  3. Configurar eventBus listeners

### Tarea 8.2: Ejecutar lint y typecheck
- **Comandos**:
  ```bash
  npm run lint
  npm run typecheck
  npm run build
  ```

---

## Orden de Implementación Recomendado

1. **Fase 1** (2 días): Estructura base + KPI Header
2. **Fase 2** (3 días): DataTable + Filtros
3. **Fase 3** (3 días): Modales (Producto, Precio, Variantes)
4. **Fase 4** (1 día): Categorías
5. **Fase 5** (1 día): Presentaciones
6. **Fase 6** (1 día): Variantes
7. **Fase 7** (0.5 días): Utilidades
8. **Fase 8** (0.5 días): Integración + Testing

**Total estimado**: 12 días

---

## Archivos a Crear

```
apps/web/src/features/products/
├── components/
│   ├── KPIHeader.tsx                    [NUEVO]
│   ├── ProductsDataTable.tsx            [NUEVO]
│   ├── ProductsFilters.tsx              [NUEVO]
│   ├── ProductEditModal.tsx             [NUEVO]
│   ├── PriceManagementModal.tsx          [NUEVO]
│   ├── VariantGeneratorModal.tsx        [NUEVO]
│   ├── CategoriesManager.tsx            [NUEVO]
│   ├── PresentationsManager.tsx         [NUEVO]
│   ├── SizeColorManager.tsx             [NUEVO]
│   └── utils/
│       └── products.utils.ts            [NUEVO]
```

## Archivos a Modificar

```
apps/web/src/features/products/
├── components/
│   └── ProductsCatalog.tsx              [MODIFICAR]
│   └── ProductsList.tsx                 [MODIFICAR]
```
