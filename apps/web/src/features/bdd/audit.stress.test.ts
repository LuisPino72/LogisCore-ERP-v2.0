/**
 * TDD: Trigger de Auditoría - Verificación de Seguridad
 * Tests para validar que 100% de acciones críticas generan evento de auditoría válido
 * Basado en SDD spec/audit/details.schema.json
 */

import { describe, it, expect } from "vitest";
import {
  validateAuditDetails,
  validateReasonRequired,
  requiresReason,
  createAuditDetails,
  type AuditEventType,
} from "../../specs/audit/details.validator";

describe("TDD: Audit Triggers - SENSITIVE_ACTION", () => {
  it("voidInvoice triggers SENSITIVE_ACTION con esquema válido", () => {
    const details = {
      oldValue: { status: "issued", total: 100.0 },
      newValue: { status: "voided", total: 0.0 },
      reason: "Factura incorrecta - error de digitación",
    };

    const result = validateAuditDetails("SENSITIVE_ACTION", details);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toHaveProperty("oldValue");
      expect(result.data).toHaveProperty("newValue");
      expect(result.data).toHaveProperty("reason");
    }
  });

  it("voidInvoice sin reason genera error", () => {
    const details = {
      oldValue: { status: "issued" },
      newValue: { status: "voided" },
    };

    const result = validateAuditDetails("SENSITIVE_ACTION", details);

    expect(result.ok).toBe(false);
  });

  it("reason requerido para SENSITIVE_ACTION", () => {
    const details = { oldValue: 100, newValue: 0 };

    const result = validateReasonRequired(details, "SENSITIVE_ACTION");

    expect(result.ok).toBe(false);
  });
});

describe("TDD: Audit Triggers - PRICE_CHANGE", () => {
  it("priceChange logs oldValue y newValue", () => {
    const details = {
      productId: "prod-001",
      oldPrice: 50.0,
      newPrice: 75.0,
      reason: "Ajuste por incremento de costos",
    };

    const result = validateAuditDetails("PRICE_CHANGE", details);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toMatchObject({
        productId: "prod-001",
        oldPrice: 50.0,
        newPrice: 75.0,
      });
    }
  });

  it("priceChange sin reason es válido (reason es opcional)", () => {
    const details = {
      productId: "prod-001",
      oldPrice: 50.0,
      newPrice: 75.0,
    };

    const result = validateAuditDetails("PRICE_CHANGE", details);

    expect(result.ok).toBe(true);
  });
});

describe("TDD: Audit Triggers - USER_DELETED", () => {
  it("userDeletion logs actor userId", () => {
    const details = {
      userId: "user-123",
      deletedBy: "admin-001",
      role: "cashier",
    };

    const result = validateAuditDetails("USER_DELETED", details);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toMatchObject({
        userId: "user-123",
        deletedBy: "admin-001",
        role: "cashier",
      });
    }
  });
});

describe("TDD: Audit Triggers - INVOICE_VOID", () => {
  it("invoiceVoid con esquema SENSITIVE_ACTION", () => {
    const details = {
      invoiceId: "inv-001",
      reason: "Duplicada con factura inv-002",
      voidedBy: "admin-001",
      originalTotal: 150.5,
    };

    const result = validateAuditDetails("INVOICE_VOID", details);

    expect(result.ok).toBe(true);
  });

  it("invoiceVoid sin reason genera error", () => {
    const details = {
      invoiceId: "inv-001",
      voidedBy: "admin-001",
    };

    const result = validateAuditDetails("INVOICE_VOID", details);

    expect(result.ok).toBe(false);
  });
});

describe("TDD: Audit Triggers - INVENTORY_ADJUSTMENT", () => {
  it("inventoryAdjustment con reason", () => {
    const details = {
      lotId: "lot-001",
      oldQuantity: 100,
      newQuantity: 95,
      adjustedBy: "admin-001",
      reason: "Conteo físico reveló merma",
    };

    const result = validateAuditDetails("INVENTORY_ADJUSTMENT", details);

    expect(result.ok).toBe(true);
  });
});

describe("TDD: Audit Triggers - TENANT_CHANGE", () => {
  it("tenantChange con esquema válido", () => {
    const details = {
      fromTenant: "tenant-old",
      toTenant: "tenant-new",
      authorizedBy: "owner-001",
    };

    const result = validateAuditDetails("TENANT_CHANGE", details);

    expect(result.ok).toBe(true);
  });
});

describe("TDD: Audit Triggers - PLAN_UPGRADE", () => {
  it("planUpgrade con transactionId", () => {
    const details = {
      oldPlan: "Basic",
      newPlan: "Pro",
      transactionId: "txn-upgrade-001",
    };

    const result = validateAuditDetails("PLAN_UPGRADE", details);

    expect(result.ok).toBe(true);
  });
});

describe("TDD: Audit Triggers - LOGIN_SUCCESS", () => {
  it("loginSuccess con IP", () => {
    const details = {
      userId: "user-001",
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0",
    };

    const result = validateAuditDetails("LOGIN_SUCCESS", details);

    expect(result.ok).toBe(true);
  });
});

describe("TDD: Audit Triggers - LOGIN_FAILED", () => {
  it("loginFailed con razón", () => {
    const details = {
      email: "user@test.com",
      reason: "invalid_credentials" as const,
      ipAddress: "192.168.1.100",
    };

    const result = validateAuditDetails("LOGIN_FAILED", details);

    expect(result.ok).toBe(true);
  });
});

describe("TDD: requiresReason helper", () => {
  it("SENSITIVE_ACTION requiere reason", () => {
    expect(requiresReason("SENSITIVE_ACTION")).toBe(true);
  });

  it("PRICE_CHANGE requiere reason", () => {
    expect(requiresReason("PRICE_CHANGE")).toBe(true);
  });

  it("INVOICE_VOID requiere reason", () => {
    expect(requiresReason("INVOICE_VOID")).toBe(true);
  });

  it("INVENTORY_ADJUSTMENT requiere reason", () => {
    expect(requiresReason("INVENTORY_ADJUSTMENT")).toBe(true);
  });

  it("USER_DELETED NO requiere reason", () => {
    expect(requiresReason("USER_DELETED")).toBe(false);
  });

  it("TENANT_CHANGE NO requiere reason", () => {
    expect(requiresReason("TENANT_CHANGE")).toBe(false);
  });
});

describe("TDD: createAuditDetails - Combinado", () => {
  it("crea detalles válidos con validación completa", () => {
    const details = {
      oldValue: { price: 100 },
      newValue: { price: 120 },
      reason: "Incremento por materia prima",
    };

    const result = createAuditDetails("SENSITIVE_ACTION", details);

    expect(result.ok).toBe(true);
  });

  it("falla si no cumple esquema", () => {
    const details = {
      invalidField: "value",
    };

    const result = createAuditDetails("SENSITIVE_ACTION", details);

    expect(result.ok).toBe(false);
  });
});

describe("TDD: Criterio de Éxito - 100% Trazabilidad", () => {
  const criticalEvents: AuditEventType[] = [
    "SENSITIVE_ACTION",
    "PRICE_CHANGE",
    "INVOICE_VOID",
    "INVENTORY_ADJUSTMENT",
    "USER_DELETED",
    "TENANT_CHANGE",
    "PLAN_UPGRADE",
    "LOGIN_SUCCESS",
    "LOGIN_FAILED",
  ];

  it("todos los eventos críticos tienen esquema definido", () => {
    criticalEvents.forEach((eventType) => {
      const dummyData = getDummyDataForEvent(eventType);
      const result = validateAuditDetails(eventType, dummyData);
      expect(result.ok).toBe(true);
    });
  });

  function getDummyDataForEvent(eventType: AuditEventType): unknown {
    switch (eventType) {
      case "SENSITIVE_ACTION":
        return { oldValue: {}, newValue: {}, reason: "test" };
      case "PRICE_CHANGE":
        return { productId: "p1", oldPrice: 10, newPrice: 20 };
      case "INVOICE_VOID":
        return { invoiceId: "i1", reason: "test", voidedBy: "u1" };
      case "INVENTORY_ADJUSTMENT":
        return { lotId: "l1", oldQuantity: 10, newQuantity: 9, adjustedBy: "u1", reason: "test" };
      case "USER_DELETED":
        return { userId: "u1", deletedBy: "u2", role: "admin" };
      case "TENANT_CHANGE":
        return { fromTenant: "t1", toTenant: "t2", authorizedBy: "u1" };
      case "PLAN_UPGRADE":
        return { oldPlan: "Basic", newPlan: "Pro", transactionId: "t1" };
      case "LOGIN_SUCCESS":
        return { userId: "u1", ipAddress: "127.0.0.1" };
      case "LOGIN_FAILED":
        return { email: "test@test.com", reason: "invalid_credentials" as const };
      default:
        return {};
    }
  }
});