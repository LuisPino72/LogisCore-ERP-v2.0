import { describe, it, expect } from "vitest";
import { ok } from "@logiscore/core";
import { createAppError } from "@logiscore/core";
import { 
  PRODUCT_ERROR_CODES, 
  createProductError 
} from "../../apps/web/src/specs/products";
import { 
  createInventoryError, 
  hasMoreThan4Decimals 
} from "../../apps/web/src/specs/inventory";
import { 
  createSalesError, 
  IGTF_RATE, 
  CENTS_TOLERANCE 
} from "../../apps/web/src/specs/sales";
import { 
  PURCHASE_ERROR_CODES, 
  SUPPLIER_ERROR_CODES, 
  createPurchaseError, 
  createSupplierError 
} from "../../apps/web/src/specs/purchases";
import { 
  createProductionOrderError, 
  calculateVariance, 
  isVarianceInTolerance 
} from "../../apps/web/src/specs/production";
import { 
  createInvoicingError, 
  RIF_PATTERN 
} from "../../apps/web/src/specs/invoicing";
import { TenantTranslatorErrors } from "../../apps/web/src/specs/tenant-translator";
import { EventBusErrors } from "../../apps/web/src/specs/event-bus";
import { 
  validateTenantMapping, 
  validateTranslationInput, 
  validateTenantMatch 
} from "../../apps/web/src/specs/tenant-translator";
import { 
  validateEventPayload, 
  validateEventName, 
  extractEventCategory 
} from "../../apps/web/src/specs/event-bus";

describe("Fase 2: TDD - Negative Cases Suite", () => {
  describe("2.1 Catálogo de Errores - Products", () => {
    it("PRODUCT_NOT_FOUND: debe retornar código correcto", () => {
      const error = createProductError(PRODUCT_ERROR_CODES.NOT_FOUND, { productId: "prod-123" });
      expect(error.code).toBe("PRODUCT_NOT_FOUND");
      expect(error.message).toBe("Producto no encontrado");
      expect(error.context?.productId).toBe("prod-123");
    });

    it("PRODUCT_WEIGHTED_PRECISION: cantidad con más de 4 decimales", () => {
      expect(hasMoreThan4Decimals(1.12345)).toBe(true);
      expect(hasMoreThan4Decimals(1.1234)).toBe(false);
      expect(hasMoreThan4Decimals(1)).toBe(false);
    });

    it("PRODUCT_DUPLICATE_SKU: SKU ya existe", () => {
      const error = createProductError(PRODUCT_ERROR_CODES.DUPLICATE_SKU, { sku: "SKU-001" });
      expect(error.code).toBe("PRODUCT_DUPLICATE_SKU");
      expect(error.context?.sku).toBe("SKU-001");
    });

    it("PRODUCT_TENANT_ID_MUST_BE_SLUG: tenantId con UUID en Dexie", () => {
      const error = createProductError(PRODUCT_ERROR_CODES.TENANT_ID_MUST_BE_SLUG);
      expect(error.code).toBe("PRODUCT_TENANT_ID_MUST_BE_SLUG");
      expect(/^[a-z0-9-]+$/.test("mi-empresa-123")).toBe(true);
      expect(/^[a-z0-9-]+$/.test("550e8400-e29b-41d4-a716-446655440000")).toBe(false);
    });
  });

  describe("2.2 Catálogo de Errores - Inventory", () => {
    it("WEIGHTED_MOVEMENT_QUANTITY_INVALID: producto pesable con >4 decimales", () => {
      const error = createInventoryError("WEIGHTED_MOVEMENT_QUANTITY_INVALID", {
        quantity: 1.12345
      });
      expect(error.code).toBe("WEIGHTED_MOVEMENT_QUANTITY_INVALID");
      expect(hasMoreThan4Decimals(1.12345)).toBe(true);
      expect(hasMoreThan4Decimals(1.1234)).toBe(false);
    });

    it("NEGATIVE_STOCK_FORBIDDEN: movimiento genera stock negativo", () => {
      const error = createInventoryError("NEGATIVE_STOCK_FORBIDDEN", {
        currentBalance: 5,
        movementType: "sale_out"
      });
      expect(error.code).toBe("NEGATIVE_STOCK_FORBIDDEN");
    });

    it("WAREHOUSE_NOT_FOUND: almacén no existe", () => {
      const error = createInventoryError("WAREHOUSE_NOT_FOUND");
      expect(error.code).toBe("INVENTORY_WAREHOUSE_NOT_FOUND");
    });

    it("STOCK_MOVEMENT_QUANTITY_INVALID: cantidad <= 0", () => {
      const error = createInventoryError("STOCK_MOVEMENT_QUANTITY_INVALID", {
        quantity: 0
      });
      expect(error.code).toBe("STOCK_MOVEMENT_QUANTITY_INVALID");
    });
  });

  describe("2.3 Catálogo de Errores - Sales", () => {
    it("SALE_IGTF_INVALID: IGTF calculado no coincide con registrado", () => {
      const error = createSalesError("IGTF_INVALID", {
        calculated: 3.0,
        stored: 2.97
      });
      expect(error.code).toBe("SALE_IGTF_INVALID");
      expect(error.context?.calculated).toBe(3.0);
      expect(error.context?.stored).toBe(2.97);
    });

    it("SALE_CENTS_ADJUSTMENT_NEEDED: diferencia <= 0.01 Bs", () => {
      const centsDiff = 0.005;
      expect(centsDiff <= CENTS_TOLERANCE).toBe(true);
      const error = createSalesError("CENTS_ADJUSTMENT_NEEDED", { cents: centsDiff });
      expect(error.code).toBe("SALE_CENTS_ADJUSTMENT_NEEDED");
    });

    it("SALE_STOCK_INSUFFICIENT: stock menor al solicitado", () => {
      const error = createSalesError("STOCK_INSUFFICIENT", {
        availableStock: 5,
        requestedQuantity: 10
      });
      expect(error.code).toBe("SALE_STOCK_INSUFFICIENT");
      expect(error.context?.availableStock).toBe(5);
      expect(error.context?.requestedQuantity).toBe(10);
    });

    it("SALE_MAX_SUSPENDED_EXCEEDED: más de 10 ventas suspendidas", () => {
      const error = createSalesError("MAX_SUSPENDED_EXCEEDED");
      expect(error.code).toBe("SALE_MAX_SUSPENDED_EXCEEDED");
    });
  });

  describe("2.4 Catálogo de Errores - Purchases", () => {
    it("PURCHASE_NOT_FOUND: orden de compra no existe", () => {
      const error = createPurchaseError(PURCHASE_ERROR_CODES.NOT_FOUND, {
        purchaseLocalId: "pur-123"
      });
      expect(error.code).toBe("PURCHASE_NOT_FOUND");
    });

    it("PURCHASE_NOT_CONFIRMED: intentar recibir orden no confirmada", () => {
      const error = createPurchaseError(PURCHASE_ERROR_CODES.NOT_CONFIRMED, {
        currentStatus: "draft"
      });
      expect(error.code).toBe("PURCHASE_NOT_CONFIRMED");
    });

    it("PURCHASE_ALREADY_RECEIVED: orden ya recibida", () => {
      const error = createPurchaseError(PURCHASE_ERROR_CODES.ALREADY_RECEIVED);
      expect(error.code).toBe("PURCHASE_ALREADY_RECEIVED");
    });

    it("PURCHASE_RECEIVING_TOTALS_MISMATCH: totales no coinciden", () => {
      const error = createPurchaseError(PURCHASE_ERROR_CODES.RECEIVING_TOTALS_MISMATCH);
      expect(error.code).toBe("PURCHASE_RECEIVING_TOTALS_MISMATCH");
    });

    it("SUPPLIER_RIF_INVALID: RIF con formato incorrecto", () => {
      expect(RIF_PATTERN.test("V123456789")).toBe(true);
      expect(RIF_PATTERN.test("X123456789")).toBe(false);
      expect(RIF_PATTERN.test("V12345678")).toBe(false);
      expect(RIF_PATTERN.test("1234567890")).toBe(false);

      const error = createSupplierError(SUPPLIER_ERROR_CODES.RIF_INVALID, {
        providedRif: "INVALIDO"
      });
      expect(error.code).toBe("SUPPLIER_RIF_INVALID");
    });
  });

  describe("2.5 Catálogo de Errores - Production", () => {
    it("PRODUCTION_ORDER_NOT_FOUND: orden no existe", () => {
      const error = createProductionOrderError("NOT_FOUND");
      expect(error.code).toBe("PRODUCTION_ORDER_NOT_FOUND");
    });

    it("PRODUCTION_NOT_IN_PROGRESS: intentar completar orden no iniciada", () => {
      const error = createProductionOrderError("NOT_IN_PROGRESS", {
        currentStatus: "draft"
      });
      expect(error.code).toBe("PRODUCTION_NOT_IN_PROGRESS");
    });

    it("PRODUCTION_VARIANCE_EXCEEDED: varianza > tolerancia", () => {
      const variance = 15;
      expect(isVarianceInTolerance(variance, 10)).toBe(false);
      expect(isVarianceInTolerance(5, 10)).toBe(true);

      const error = createProductionOrderError("VARIANCE_EXCEEDED", {
        variancePercent: variance,
        maxVariance: 10
      });
      expect(error.code).toBe("PRODUCTION_VARIANCE_EXCEEDED");
    });

    it("PRODUCTION_INGREDIENT_STOCK_INSUFFICIENT: stock de ingredientes insuficiente", () => {
      const error = createProductionOrderError("INGREDIENT_STOCK_INSUFFICIENT", {
        ingredientProductId: "ing-123",
        availableStock: 2,
        requiredStock: 5
      });
      expect(error.code).toBe("PRODUCTION_INGREDIENT_STOCK_INSUFFICIENT");
    });
  });

  describe("2.6 Catálogo de Errores - Invoicing", () => {
    it("INVOICE_RIF_INVALID: RIF de cliente inválido", () => {
      const error = createInvoicingError("RIF_INVALID", {
        customerRif: "INVALIDO"
      });
      expect(error.code).toBe("INVOICE_RIF_INVALID");
      expect(RIF_PATTERN.test("V012345678")).toBe(true);
      expect(RIF_PATTERN.test("J012345678")).toBe(true);
      expect(RIF_PATTERN.test("G012345678")).toBe(true);
      expect(RIF_PATTERN.test("X123456789")).toBe(false);
    });

    it("INVOICE_RANGE_EXHAUSTED: talonario agotado", () => {
      const error = createInvoicingError("RANGE_EXHAUSTED", {
        currentNumber: 100,
        endNumber: 100
      });
      expect(error.code).toBe("INVOICE_RANGE_EXHAUSTED");
    });

    it("INVOICE_IGTF_MISMATCH: IGTF en factura no coincide", () => {
      const error = createInvoicingError("IGTF_MISMATCH", {
        calculated: 3.0,
        stored: 2.85
      });
      expect(error.code).toBe("INVOICE_IGTF_MISMATCH");
    });

    it("INVOICE_EXCHANGE_RATE_SNAPSHOT_MISSING: snapshot requerido", () => {
      const error = createInvoicingError("EXCHANGE_RATE_SNAPSHOT_MISSING");
      expect(error.code).toBe("INVOICE_EXCHANGE_RATE_SNAPSHOT_MISSING");
    });

    it("HARD_DELETE_NOT_ALLOWED: intento de hard delete", () => {
      const error = createInvoicingError("HARD_DELETE_NOT_ALLOWED");
      expect(error.code).toBe("HARD_DELETE_NOT_ALLOWED");
      expect(error.message).toContain("Soft delete");
    });
  });

  describe("2.7 Catálogo de Errores - TenantTranslator", () => {
    it("SYNC_TENANT_TRANSLATION_FAILED: falla en resolución de UUID", () => {
      const error = TenantTranslatorErrors.TRANSLATION_FAILED;
      expect(error.code).toBe("SYNC_TENANT_TRANSLATION_FAILED");
    });

    it("TENANT_MISMATCH: payload y sesión de tenant diferentes", () => {
      const result = validateTenantMatch("tenant-a", "tenant-b");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("TENANT_MISMATCH");
      }
    });

    it("TENANT_INVALID_SLUG_FORMAT: slug con caracteres inválidos", () => {
      const result = validateTranslationInput("Tenant_With_SPACES");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("TENANT_INVALID_SLUG_FORMAT");
      }

      const validResult = validateTranslationInput("mi-empresa-123");
      expect(validResult.ok).toBe(true);
    });

    it("validateTenantMapping: mapping inválido", () => {
      const invalidMapping = { tenantSlug: "INVALID SLUG", tenantUuid: "not-a-uuid" };
      const result = validateTenantMapping(invalidMapping);
      expect(result.ok).toBe(false);
    });
  });

  describe("2.8 Catálogo de Errores - EventBus", () => {
    it("EVENTBUS_INVALID_EVENT_NAME: nombre de evento mal formado", () => {
      expect(validateEventName("product.created")).toBe(false);
      expect(validateEventName("PRODUCT_CREATED")).toBe(false);
      expect(validateEventName("PRODUCT.CREATED")).toBe(true);
      expect(validateEventName("MODULE.ACTION_NAME")).toBe(true);
    });

    it("EVENTBUS_PAYLOAD_VALIDATION_FAILED: payload no coincide con esquema", () => {
      const result = validateEventPayload("SALE.COMPLETED", {
        saleLocalId: "not-a-uuid",
        saleNumber: "001"
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("EVENTBUS_PAYLOAD_VALIDATION_FAILED");
      }
    });

    it("extractEventCategory: categoría desconocida retorna null", () => {
      expect(extractEventCategory("PRODUCT.CREATED")).toBe("PRODUCT");
      expect(extractEventCategory("UNKNOWN.ACTION")).toBeNull();
    });
  });

  describe("2.9 Validación de Cálculos Fiscales", () => {
    it("IGTF: 3% sobre pagos USD es obligatorio", () => {
      const amountUSD = 100;
      const igtfAmount = amountUSD * IGTF_RATE;
      expect(igtfAmount).toBe(3);

      const amountVES = 500000;
      const igtfOnVES = amountVES * IGTF_RATE;
      expect(igtfOnVES).toBe(15000);
    });

    it("Regla de céntimos: diferencias <= 0.01 son aceptadas", () => {
      const tolerance = 0.01;
      expect(0.005 <= tolerance).toBe(true);
      expect(0.01 <= tolerance).toBe(true);
      expect(0.02 <= tolerance).toBe(false);
    });

    it("Cálculo de varianza: fórmula correcta", () => {
      const planned = 100;
      const produced = 110;
      const variance = calculateVariance(planned, produced);
      expect(variance).toBe(10);

      const produced2 = 90;
      const variance2 = calculateVariance(planned, produced2);
      expect(variance2).toBe(-10);
    });
  });

  describe("2.10 Blindaje de Soft Delete", () => {
    it("PRODUCT_SOFT_DELETE: hard delete prohibido", () => {
      const error = createProductError(PRODUCT_ERROR_CODES.SOFT_DELETE);
      expect(error.code).toBe("PRODUCT_SOFT_DELETE");
      expect(error.message).toContain("Hard delete");
    });

    it("PURCHASE_SOFT_DELETE: hard delete prohibido", () => {
      const error = createPurchaseError(PURCHASE_ERROR_CODES.SOFT_DELETE);
      expect(error.code).toBe("PURCHASE_SOFT_DELETE");
    });

    it("PRODUCTION_ORDER_NOT_FOUND: verificado", () => {
      const error = createProductionOrderError("NOT_FOUND");
      expect(error.code).toBe("PRODUCTION_ORDER_NOT_FOUND");
    });
  });
});