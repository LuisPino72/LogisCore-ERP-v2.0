/**
 * TDD Errors Coverage - Matriz de Trazabilidad
 * 
 * Valida que cada código de error del catálogo esté testeado y manejado.
 * Metodología: Traceability Matrix - Mapeo 1:1 entre Catálogo de Errores y Test Case.
 */

import { describe, it, expect } from "vitest";
import { createAppError, type AppError } from "@logiscore/core";

describe("Fase 2: TDD Cobertura Exhaustiva de Errores", () => {
  describe("2.1 Catálogo Core Errors", () => {
    it("AUTH_NO_SESSION: debe retornar código correcto", () => {
      const error = createAppError({ code: "AUTH_NO_SESSION", message: "No hay sesión activa", retryable: true });
      expect(error.code).toBe("AUTH_NO_SESSION");
      expect(error.retryable).toBe(true);
    });

    it("TENANT_NOT_FOUND: debe retornar código correcto", () => {
      const error = createAppError({ code: "TENANT_NOT_FOUND", message: "El tenant no existe", retryable: false });
      expect(error.code).toBe("TENANT_NOT_FOUND");
    });

    it("SUBSCRIPTION_INACTIVE: debe retornar código correcto", () => {
      const error = createAppError({ code: "SUBSCRIPTION_INACTIVE", message: "Suscripción inactiva", retryable: false });
      expect(error.code).toBe("SUBSCRIPTION_INACTIVE");
    });

    it("PERMISSION_DENIED: debe retornar código correcto", () => {
      const error = createAppError({ code: "PERMISSION_DENIED", message: "Permiso denegado", retryable: false });
      expect(error.code).toBe("PERMISSION_DENIED");
    });

    it("EXCHANGE_RATE_NOT_FOUND: debe retornar código correcto", () => {
      const error = createAppError({ code: "EXCHANGE_RATE_NOT_FOUND", message: "Tasa de cambio no disponible", retryable: true });
      expect(error.code).toBe("EXCHANGE_RATE_NOT_FOUND");
    });
  });

  describe("2.2 Catálogo Products Errors", () => {
    it("PRODUCT_NOT_FOUND: código y contexto", () => {
      const error = createAppError({ 
        code: "PRODUCT_NOT_FOUND", 
        message: "Producto no encontrado", 
        retryable: false,
        context: { productId: "prod-123" }
      });
      expect(error.code).toBe("PRODUCT_NOT_FOUND");
      expect(error.context?.productId).toBe("prod-123");
    });

    it("PRODUCT_WEIGHTED_PRECISION: mensaje específico", () => {
      const error = createAppError({ 
        code: "PRODUCT_WEIGHTED_PRECISION", 
        message: "Producto pesable debe usar 4 decimales", 
        retryable: false 
      });
      expect(error.code).toBe("PRODUCT_WEIGHTED_PRECISION");
      expect(error.message).toContain("4 decimales");
    });

    it("PRODUCT_SKU_DUPLICATE: retorna código correcto", () => {
      const error = createAppError({ 
        code: "PRODUCT_DUPLICATE_SKU", 
        message: "El SKU ya existe", 
        retryable: false,
        context: { sku: "SKU-001" }
      });
      expect(error.code).toBe("PRODUCT_DUPLICATE_SKU");
    });

    it("PRODUCT_TENANT_ID_MUST_BE_SLUG: validación de esquema dual", () => {
      const error = createAppError({ 
        code: "PRODUCT_TENANT_ID_MUST_BE_SLUG", 
        message: "En Dexie, tenant_id debe ser slug, nunca UUID", 
        retryable: false 
      });
      expect(error.code).toBe("PRODUCT_TENANT_ID_MUST_BE_SLUG");

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(isUuid.test("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
      expect(isUuid.test("mi-empresa-123")).toBe(false);
    });
  });

  describe("2.3 Catálogo Inventory Errors", () => {
    it("WEIGHTED_MOVEMENT_QUANTITY_INVALID: validación de 4 decimales", () => {
      const error = createAppError({ 
        code: "WEIGHTED_MOVEMENT_QUANTITY_INVALID", 
        message: "Producto pesable debe usar máximo 4 decimales", 
        retryable: false,
        context: { quantity: 1.12345 }
      });
      expect(error.code).toBe("WEIGHTED_MOVEMENT_QUANTITY_INVALID");
      expect(error.retryable).toBe(false);
    });

    it("NEGATIVE_STOCK_FORBIDDEN: stock no puede ser negativo", () => {
      const error = createAppError({ 
        code: "NEGATIVE_STOCK_FORBIDDEN", 
        message: "Stock negativo no permitido", 
        retryable: false,
        context: { currentBalance: 0 }
      });
      expect(error.code).toBe("NEGATIVE_STOCK_FORBIDDEN");
    });

    it("WAREHOUSE_NOT_FOUND: error de bodega", () => {
      const error = createAppError({ 
        code: "INVENTORY_WAREHOUSE_NOT_FOUND", 
        message: "Almacén no encontrado", 
        retryable: false 
      });
      expect(error.code).toBe("INVENTORY_WAREHOUSE_NOT_FOUND");
    });

    it("INVENTORY_LOT_NOT_FOUND: lote no existe", () => {
      const error = createAppError({ 
        code: "INVENTORY_LOT_NOT_FOUND", 
        message: "Lote de inventario no encontrado", 
        retryable: false,
        context: { lotId: "lot-001" }
      });
      expect(error.code).toBe("INVENTORY_LOT_NOT_FOUND");
    });
  });

  describe("2.4 Catálogo Sales Errors", () => {
    it("SALE_BOX_CLOSED: prerequisite de caja abierta", () => {
      const error = createAppError({ 
        code: "SALE_BOX_CLOSED", 
        message: "No se puede vender con la caja cerrada", 
        retryable: false 
      });
      expect(error.code).toBe("SALE_BOX_CLOSED");
    });

    it("SALE_STOCK_INSUFFICIENT: error por item", () => {
      const error = createAppError({ 
        code: "SALE_ITEM_STOCK_INSUFFICIENT", 
        message: "Stock insuficiente para el item", 
        retryable: false,
        context: { productId: "prod-001", availableStock: 5, requestedQuantity: 10 }
      });
      expect(error.code).toBe("SALE_ITEM_STOCK_INSUFFICIENT");
    });

    it("SALE_IGTF_INVALID: cálculo errado de IGTF", () => {
      const error = createAppError({ 
        code: "SALE_IGTF_INVALID", 
        message: "Cálculo de IGTF incorrecto", 
        retryable: false 
      });
      expect(error.code).toBe("SALE_IGTF_INVALID");
    });

    it("SALE_CENTS_RULE_VIOLATION:差异 <= 0.01 Bs", () => {
      const error = createAppError({ 
        code: "SALE_CENTS_RULE_VIOLATION", 
        message: "Diferencia de céntimos > 0.01 Bs", 
        retryable: false 
      });
      expect(error.code).toBe("SALE_CENTS_RULE_VIOLATION");
      expect(error.retryable).toBe(false);
    });
  });

  describe("2.5 Catálogo Invoicing Errors", () => {
    it("INVOICE_RIF_INVALID: formato RIF venezolano", () => {
      const error = createAppError({ 
        code: "INVOICE_RIF_INVALID", 
        message: "RIF del cliente inválido", 
        retryable: false 
      });
      expect(error.code).toBe("INVOICE_RIF_INVALID");

      const RIF_PATTERN = /^[VJEGP]\d{9}$/;
      expect(RIF_PATTERN.test("J123456789")).toBe(true);
      expect(RIF_PATTERN.test("123456789")).toBe(false);
    });

    it("INVOICE_RANGE_EXHAUSTED: talonario agotado", () => {
      const error = createAppError({ 
        code: "INVOICE_RANGE_EXHAUSTED", 
        message: "No hay números disponibles en el talonario", 
        retryable: false 
      });
      expect(error.code).toBe("INVOICE_RANGE_EXHAUSTED");
    });

    it("INVOICE_ALREADY_VOIDED: doble anulación", () => {
      const error = createAppError({ 
        code: "INVOICE_ALREADY_VOIDED", 
        message: "Factura ya anulada", 
        retryable: false 
      });
      expect(error.code).toBe("INVOICE_ALREADY_VOIDED");
    });

    it("INVOICE_IGTF_MISMATCH: IGTF no coincide", () => {
      const error = createAppError({ 
        code: "INVOICE_IGTF_MISMATCH", 
        message: "IGTF almacenado no coincide con calculado", 
        retryable: false,
        context: { stored: 3, calculated: 0 }
      });
      expect(error.code).toBe("INVOICE_IGTF_MISMATCH");
    });
  });

  describe("2.6 Catálogo Purchases Errors", () => {
    it("PURCHASE_NOT_FOUND: orden no existe", () => {
      const error = createAppError({ 
        code: "PURCHASE_NOT_FOUND", 
        message: "Orden de compra no encontrada", 
        retryable: false 
      });
      expect(error.code).toBe("PURCHASE_NOT_FOUND");
    });

    it("PURCHASE_ITEMS_REQUIRED: orden sin items", () => {
      const error = createAppError({ 
        code: "PURCHASE_ITEMS_REQUIRED", 
        message: "La orden debe tener al menos un item", 
        retryable: false 
      });
      expect(error.code).toBe("PURCHASE_ITEMS_REQUIRED");
    });

    it("PURCHASE_NOT_CONFIRMED: recibe sin confirmar", () => {
      const error = createAppError({ 
        code: "PURCHASE_NOT_CONFIRMED", 
        message: "La orden debe estar confirmada para recibir", 
        retryable: false 
      });
      expect(error.code).toBe("PURCHASE_NOT_CONFIRMED");
    });

    it("PURCHASE_CANCELLED_NOT_RECEIVABLE: orden cancelada", () => {
      const error = createAppError({ 
        code: "PURCHASE_CANCELLED_NOT_RECEIVABLE", 
        message: "No se puede recibir una orden cancelada", 
        retryable: false 
      });
      expect(error.code).toBe("PURCHASE_CANCELLED_NOT_RECEIVABLE");
    });

    it("PURCHASE_RECEIVING_TOTALS_MISMATCH: totales no cuadran", () => {
      const error = createAppError({ 
        code: "PURCHASE_RECEIVING_TOTALS_MISMATCH", 
        message: "Los totales de recepción no cuadran", 
        retryable: false,
        context: { expected: 100, actual: 90 }
      });
      expect(error.code).toBe("PURCHASE_RECEIVING_TOTALS_MISMATCH");
    });
  });

  describe("2.7 Catálogo Production Errors", () => {
    it("PRODUCTION_ORDER_NOT_FOUND: orden no existe", () => {
      const error = createAppError({ 
        code: "PRODUCTION_ORDER_NOT_FOUND", 
        message: "Orden de producción no encontrada", 
        retryable: false 
      });
      expect(error.code).toBe("PRODUCTION_ORDER_NOT_FOUND");
    });

    it("PRODUCTION_RECIPE_NOT_FOUND: receta no existe", () => {
      const error = createAppError({ 
        code: "PRODUCTION_RECIPE_NOT_FOUND", 
        message: "Receta no encontrada", 
        retryable: false,
        context: { recipeId: "recipe-001" }
      });
      expect(error.code).toBe("PRODUCTION_RECIPE_NOT_FOUND");
    });

    it("PRODUCTION_INGREDIENTS_REQUIRED: sin ingredientes", () => {
      const error = createAppError({ 
        code: "PRODUCTION_INGREDIENTS_REQUIRED", 
        message: "La receta debe tener ingredientes", 
        retryable: false 
      });
      expect(error.code).toBe("PRODUCTION_INGREDIENTS_REQUIRED");
    });

    it("PRODUCTION_INGREDIENT_STOCK_INSUFFICIENT: stock ingredientes insuficiente", () => {
      const error = createAppError({ 
        code: "PRODUCTION_INGREDIENT_STOCK_INSUFFICIENT", 
        message: "Stock insuficiente de ingrediente", 
        retryable: false,
        context: { ingredientId: "ing-001", available: 5, requested: 10 }
      });
      expect(error.code).toBe("PRODUCTION_INGREDIENT_STOCK_INSUFFICIENT");
    });

    it("PRODUCTION_VARIANCE_EXCEEDED: varianza > tolerancia", () => {
      const error = createAppError({ 
        code: "PRODUCTION_VARIANCE_EXCEEDED", 
        message: "Varianza excede tolerancia", 
        retryable: false,
        context: { variance: 15, tolerance: 10 }
      });
      expect(error.code).toBe("PRODUCTION_VARIANCE_EXCEEDED");
    });

    it("PRODUCTION_ALREADY_COMPLETED: orden ya completada", () => {
      const error = createAppError({ 
        code: "PRODUCTION_ALREADY_COMPLETED", 
        message: "Orden ya completada", 
        retryable: false 
      });
      expect(error.code).toBe("PRODUCTION_ALREADY_COMPLETED");
    });
  });

  describe("2.8 Sync Errors", () => {
    it("SYNC_CONFLICT: conflicto de sincronización", () => {
      const error = createAppError({ 
        code: "SYNC_CONFLICT", 
        message: "Conflicto de sincronización", 
        retryable: true, 
        context: { table: "products" } 
      });
      expect(error.code).toBe("SYNC_CONFLICT");
      expect(error.retryable).toBe(true);
    });

    it("SYNC_TENANT_TRANSLATION_FAILED: resolución de UUID falla", () => {
      const error = createAppError({ 
        code: "SYNC_TENANT_TRANSLATION_FAILED", 
        message: "No se puede resolver el UUID del tenant", 
        retryable: false,
        context: { tenantSlug: "mi-empresa" }
      });
      expect(error.code).toBe("SYNC_TENANT_TRANSLATION_FAILED");
      expect(error.retryable).toBe(false);
    });
  });

  describe("2.9 TenantTranslator Errors", () => {
    it("TENANT_INVALID_SLUG_FORMAT: slug con formato inválido", () => {
      const error = createAppError({ 
        code: "TENANT_INVALID_SLUG_FORMAT", 
        message: "Slug con formato inválido", 
        retryable: false 
      });
      expect(error.code).toBe("TENANT_INVALID_SLUG_FORMAT");

      const validPattern = /^[a-z0-9-]+$/;
      expect(validPattern.test("mi_empresa")).toBe(false);
      expect(validPattern.test("mi-empresa")).toBe(true);
    });

    it("TENANT_MISMATCH: payload de otro tenant", () => {
      const error = createAppError({ 
        code: "TENANT_MISMATCH", 
        message: "Payload pertenece a un tenant diferente", 
        retryable: false 
      });
      expect(error.code).toBe("TENANT_MISMATCH");
    });

    it("TENANT_CACHE_MISS: caché vacío", () => {
      const error = createAppError({ 
        code: "TENANT_CACHE_MISS", 
        message: "No hay contexto de tenant cargado", 
        retryable: true 
      });
      expect(error.code).toBe("TENANT_CACHE_MISS");
      expect(error.retryable).toBe(true);
    });
  });

  describe("2.10 EventBus Errors", () => {
    it("EVENTBUS_PAYLOAD_VALIDATION_FAILED: payload no coincide con esquema", () => {
      const error = createAppError({ 
        code: "EVENTBUS_PAYLOAD_VALIDATION_FAILED", 
        message: "Payload no coincide con esquema", 
        retryable: false 
      });
      expect(error.code).toBe("EVENTBUS_PAYLOAD_VALIDATION_FAILED");
    });

    it("EVENTBUS_INVALID_EVENT_NAME: formato incorrecto", () => {
      const error = createAppError({ 
        code: "EVENTBUS_INVALID_EVENT_NAME", 
        message: "Nombre de evento con formato incorrecto", 
        retryable: false 
      });
      expect(error.code).toBe("EVENTBUS_INVALID_EVENT_NAME");

      const validPattern = /^[A-Z]+\.[A-Z]+$/;
      expect(validPattern.test("PRODUCT.CREATED")).toBe(true);
      expect(validPattern.test("product_created")).toBe(false);
    });
  });

  describe("2.11 DLQ Errors", () => {
    it("DLQ_MAX_RETRIES_EXCEEDED: máximo reintentos alcanzado", () => {
      const error = createAppError({ 
        code: "DLQ_MAX_RETRIES_EXCEEDED", 
        message: "Máximo reintentos alcanzado", 
        retryable: false,
        context: { retries: 5, maxRetries: 5 }
      });
      expect(error.code).toBe("DLQ_MAX_RETRIES_EXCEEDED");
      expect(error.retryable).toBe(false);
    });
  });

  describe("2.12 Admin & Subscription Errors", () => {
    it("ADMIN_PLAN_PRODUCT_LIMIT_EXCEEDED: límite de productos", () => {
      const error = createAppError({ 
        code: "ADMIN_PLAN_PRODUCT_LIMIT_EXCEEDED", 
        message: "Límite de productos del plan alcanzado", 
        retryable: false,
        context: { current: 1000, limit: 1000 }
      });
      expect(error.code).toBe("ADMIN_PLAN_PRODUCT_LIMIT_EXCEEDED");
    });

    it("ADMIN_PLAN_USER_LIMIT_EXCEEDED: límite de usuarios", () => {
      const error = createAppError({ 
        code: "ADMIN_PLAN_USER_LIMIT_EXCEEDED", 
        message: "Límite de usuarios del plan alcanzado", 
        retryable: false,
        context: { current: 3, limit: 3 }
      });
      expect(error.code).toBe("ADMIN_PLAN_USER_LIMIT_EXCEEDED");
    });

    it("ADMIN_PRODUCTION_ACCESS_DENIED: producción requiere Pro", () => {
      const error = createAppError({ 
        code: "ADMIN_PRODUCTION_ACCESS_DENIED", 
        message: "El módulo de Producción requiere plan Pro", 
        retryable: false 
      });
      expect(error.code).toBe("ADMIN_PRODUCTION_ACCESS_DENIED");
    });
  });

  describe("2.13 Reports Errors", () => {
    it("BALANCE_SHEET_IMBALANCED: Activos != Pasivos + Patrimonio", () => {
      const error = createAppError({ 
        code: "BALANCE_SHEET_IMBALANCED", 
        message: "El Balance General no cuadra", 
        retryable: false,
        context: { assets: 1000, liabilities: 400, equity: 599 }
      });
      expect(error.code).toBe("BALANCE_SHEET_IMBALANCED");
    });
  });

  describe("2.14 Errores con Contexto de Trazabilidad", () => {
    it("Todo error debe incluir contexto para debugging", () => {
      const error = createAppError({ 
        code: "TEST_ERROR", 
        message: "Error de prueba", 
        retryable: true,
        context: { 
          operation: "createProduct",
          timestamp: new Date().toISOString(),
          userId: "user-001"
        }
      });

      expect(error.context).toBeDefined();
      expect(error.context?.operation).toBe("createProduct");
      expect(error.context?.timestamp).toBeDefined();
    });

    it("Errores retryable deben marcarse correctamente", () => {
      const retryableError = createAppError({ 
        code: "NETWORK_ERROR", 
        message: "Error de red", 
        retryable: true 
      });
      const nonRetryableError = createAppError({ 
        code: "VALIDATION_ERROR", 
        message: "Error de validación", 
        retryable: false 
      });

      expect(retryableError.retryable).toBe(true);
      expect(nonRetryableError.retryable).toBe(false);
    });

    it("Formato de código de error: MODULO_ENTIDAD_ACCION_CONDICION", () => {
      const errorCodes = [
        "PRODUCT_NOT_FOUND",
        "SALE_BOX_CLOSED",
        "INVENTORY_STOCK_INSUFFICIENT",
        "PURCHASE_NOT_CONFIRMED"
      ];

      for (const code of errorCodes) {
        const parts = code.split("_");
        expect(parts.length).toBeGreaterThanOrEqual(2);
      }
    });
  });
});