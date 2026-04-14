# Product Specification

> **Única Fuente de Verdad (SSoT)**  
> Version: 1.0.0  
> Generated: 2026-04-14T18:21:58.339Z

Catálogo de productos - Única Fuente de Verdad (SSoT). Este schema valida todas las operaciones de Products incluyendo Inventory y Fiscal.

## Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| local_id | string | ✅ | ID generado en cliente (crypto.randomUUID()) |
| tenant_id | string | ✅ | SLUG del tenant (NUNCA UUID) - Modo Dexie |
| name | string | ✅ | Nombre del producto |
| sku | string | ✅ | Código único del producto |
| description | string,null | ❌ | Descripción del producto |
| category_id | string,null | ❌ | FK a categories |
| is_weighted | boolean | ✅ | Producto pesable (requiere 4 decimales en cantidades) |
| unit_of_measure | string | ✅ | Unidad de medida base |
| is_taxable | boolean | ✅ | Aplica impuestos (IVA, IGTF) |
| is_serialized | boolean | ✅ | Usa seriales |
| default_presentation_id | string,null | ❌ | FK a presentations por defecto |
| visible | boolean | ✅ | Visible en POS |
| deleted_at | string,null | ❌ | Soft delete - timestamps o null si no eliminado |
| created_at | string | ✅ | Fecha de creación (UTC) |

## Business Rules

| Rule | Condition | Error Code | Enforcement |
|------|-----------|------------|-------------|
| weighted_precision | is_weighted === true | PRODUCT_WEIGHTED_PRECISION | RUNTIME |
| unit_weighted_match | is_weighted === true | PRODUCT_UNIT_WEIGHTED_MISMATCH | RUNTIME |
| unit_non_weighted | is_weighted === false | PRODUCT_UNIT_NON_WEIGHTED | RUNTIME |
| soft_delete | ALWAYS | PRODUCT_SOFT_DELETE | QUERY_BUILDER |
| tenant_is_slug | ALWAYS | PRODUCT_TENANT_ID_MUST_BE_SLUG | SYNC_ENGINE |

## Error Codes

| Code | Message | Retryable |
|------|---------|-----------|
| PRODUCT_NOT_FOUND | Producto no encontrado | No |
| PRODUCT_DUPLICATE_SKU | Ya existe un producto con este SKU | No |
| PRODUCT_WEIGHTED_PRECISION | Producto pesable debe usar máximo 4 decimales en cantidades | No |
| PRODUCT_UNIT_WEIGHTED_MISMATCH | Producto pesable debe usar unidad de masa (kg, lb, gr) | No |
| PRODUCT_UNIT_NON_WEIGHTED | Producto no pesable debe usar unidad 'un' | No |
| PRODUCT_TENANT_ID_MUST_BE_SLUG | En Dexie, tenant_id debe ser slug, nunca UUID | No |
| PRODUCT_DEFAULT_PRESENTATION_DUPLICATE | Solo puede existir una presentación por defecto | No |
| PRODUCT_BARCODE_MISSING | Al menos una presentación debe tener barcode para operación POS | No |
| PRODUCT_SOFT_DELETE | Hard delete no permitido - usar soft delete | No |

## Decimal Precision

| Type | Calculation | Display |
|------|-------------|---------|
| Money | 4 | 2 |
| Weighted Quantity | 4 | 4 |
| Non-Weighted Quantity | 0 | 0 |

## References

- Architecture: Memoria/ARCHITECTURE.md
- Section: 2.3.1 Catálogo / 5 Ciclo de Vida de Productos Pesables
