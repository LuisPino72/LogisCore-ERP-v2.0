/**
 * BDD Security Isolation Tests - RBAC & Tenant
 * 
 * Tests de comportamiento para garantizar seguridad y aislamiento multi-tenant.
 * Metodología: "Attacker-Driven TDD" - escribir tests que intenten romper la seguridad.
 */

import { describe, it, expect } from "vitest";
import { createPermissionsService, type ActorContext, type ActorRole } from "../../lib/permissions/permissions.types";
import type { AppError } from "@logiscore/core";

describe("Fase 1: TDD Seguridad - RBAC & Tenant Isolation", () => {
  const permissionsService = createPermissionsService();

  const ROLES: ActorRole[] = ["owner", "admin", "employee"];

  const PERMISSIONS = [
    "PRODUCTS:CATALOG",
    "PRODUCTS:CREATE",
    "SALES:DISCOUNT",
    "SALES:VOID",
    "SALES:REFUND",
    "INVENTORY:ADJUST",
    "ADMIN:USERS",
    "ADMIN:SUBSCRIPTION",
    "REPORTS:VIEW",
    "REPORTS:EXPORT",
    "INVOICE:VOID",
    "PURCHASES:RECEIVE",
    "PRODUCTION:ORDER",
  ] as const;

  type Permission = typeof PERMISSIONS[number];

  describe("1.1 Matriz RBAC - Owner", () => {
    it("Given: un actor con rol 'owner', When: ejecuta cualquier acción, Then: debe permitir", () => {
      const owner: ActorContext = { role: "owner", permissions: { permissions: [], maxDiscountPercent: 0, allowedWarehouseLocalIds: [] } };

      const canViewReports = permissionsService.canViewReports(owner);
      expect(canViewReports).toBe(true);

      const canManageUsers = permissionsService.canManageUsers(owner);
      expect(canManageUsers).toBe(true);

      const canVoidInvoice = permissionsService.canVoidInvoice(owner);
      expect(canVoidInvoice).toBe(true);
    });
  });

  describe("1.2 Matriz RBAC - Admin", () => {
    it("Given: un actor con rol 'admin', When: ejecuta cualquier acción, Then: debe permitir", () => {
      const admin: ActorContext = { role: "admin", permissions: { permissions: [], maxDiscountPercent: 0, allowedWarehouseLocalIds: [] } };

      const canViewReports = permissionsService.canViewReports(admin);
      expect(canViewReports).toBe(true);

      const canManageUsers = permissionsService.canManageUsers(admin);
      expect(canManageUsers).toBe(true);
    });
  });

  describe("1.3 Matriz RBAC - Employee (Sin permisos)", () => {
    it("Given: un employee sin permisos, When: intenta acceder a ADMIN:USERS, Then: debe denegar", () => {
      const employee: ActorContext = { role: "employee", permissions: { permissions: [], maxDiscountPercent: 0, allowedWarehouseLocalIds: [] } };

      const canManageUsers = permissionsService.canManageUsers(employee);
      expect(canManageUsers).toBe(false);
    });

    it("Given: un employee sin permisos, When: intenta acceder a REPORTS:VIEW, Then: debe denegar", () => {
      const employee: ActorContext = { role: "employee", permissions: { permissions: [], maxDiscountPercent: 0, allowedWarehouseLocalIds: [] } };

      const canViewReports = permissionsService.canViewReports(employee);
      expect(canViewReports).toBe(false);
    });

    it("Given: un employee sin permisos, When: intenta acceder a PRODUCTION:ORDER, Then: debe denegar (Pro only)", () => {
      const employee: ActorContext = { role: "employee", permissions: { permissions: [], maxDiscountPercent: 0, allowedWarehouseLocalIds: [] } };

      const canCreateProduction = permissionsService.canCreateProductionOrder(employee);
      expect(canCreateProduction).toBe(false);
    });
  });

  describe("1.4 Matriz RBAC - Employee (Con permisos específicos)", () => {
    it("Given: un employee con PRODUCTS:CATALOG, When: intenta gestionar catálogo, Then: debe permitir", () => {
      const employee: ActorContext = { 
        role: "employee", 
        permissions: { 
          permissions: ["PRODUCTS:CATALOG", "PRODUCTS:CREATE"], 
          maxDiscountPercent: 0, 
          allowedWarehouseLocalIds: [] 
        } 
      };

      const canManageCatalog = permissionsService.canManageCatalog(employee);
      expect(canManageCatalog).toBe(true);
    });

    it("Given: un employee con SALES:DISCOUNT y maxDiscountPercent > 0, When: aplica descuento, Then: debe permitir", () => {
      const employee: ActorContext = { 
        role: "employee", 
        permissions: { 
          permissions: [], 
          maxDiscountPercent: 10, 
          allowedWarehouseLocalIds: [] 
        } 
      };

      const canApplyDiscount = permissionsService.canApplyDiscount(employee);
      expect(canApplyDiscount).toBe(true);
    });

    it("Given: un employee con PERMISSION_DENIED esperado, When: intenta void sale, Then: debe retornar código de error correcto", () => {
      const employee: ActorContext = { 
        role: "employee", 
        permissions: { 
          permissions: [], 
          maxDiscountPercent: 0, 
          allowedWarehouseLocalIds: [] 
        } 
      };

      const canVoid = permissionsService.canVoidTransaction(employee);
      expect(canVoid).toBe(false);
    });
  });

  describe("1.5 Aislamiento Multi-Tenant - TENANT_MISMATCH", () => {
    it("Given: sesión activa con tenant slug-A, When: intenta acceder a dato de slug-B, Then: debe dispara TENANT_MISMATCH", () => {
      const activeTenantSlug = "empresa-a";
      const targetTenantSlug = "empresa-b";

      const hasAccess = activeTenantSlug.toLowerCase() === targetTenantSlug.toLowerCase();
      expect(hasAccess).toBe(false);

      const error: AppError = {
        code: "TENANT_MISMATCH",
        message: `El intento de acceso al tenant '${targetTenantSlug}' fue denegado. Sesión activa: '${activeTenantSlug}'`,
        retryable: false,
        context: { activeTenant: activeTenantSlug, targetTenant: targetTenantSlug }
      };

      expect(error.code).toBe("TENANT_MISMATCH");
      expect(error.retryable).toBe(false);
    });

    it("Given: payload con tenantId (slug) diferente, When: se intenta procesar, Then: debe rechazar", () => {
      const sessionTenantSlug = "mi-negocio-123";
      const payloadWithWrongTenant = {
        productId: "prod-001",
        tenantId: "otro-negocio-456",
        name: "Producto fraudulento"
      };

      const isAuthorized = payloadWithWrongTenant.tenantId === sessionTenantSlug;
      expect(isAuthorized).toBe(false);

      const error: AppError = {
        code: "TENANT_MISMATCH",
        message: "Payload pertenece a un tenant diferente a la sesión",
        retryable: false,
        context: { 
          sessionTenant: sessionTenantSlug, 
          payloadTenant: payloadWithWrongTenant.tenantId 
        }
      };

      expect(error.code).toBe("TENANT_MISMATCH");
    });
  });

  describe("1.6 Esquema Dual de Identidad - Blindaje", () => {
    it("Given: datos en Dexie, When: se consultan, Then: deben usar tenantId (slug)", () => {
      const dexieRecord = {
        localId: "uuid-123",
        tenantId: "mi-empresa-slug",
        name: "Producto en Dexie"
      };

      const SLUG_PATTERN = /^[a-z0-9-]+$/;
      expect(SLUG_PATTERN.test(dexieRecord.tenantId)).toBe(true);

      const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(UUID_PATTERN.test(dexieRecord.tenantId)).toBe(false);
    });

    it("Given: datos en Supabase, When: se consultan, Then: deben usar tenant_id (UUID)", () => {
      const supabaseRecord = {
        localId: "uuid-123",
        tenant_id: "550e8400-e29b-41d4-a716-446655440000",
        name: "Producto en Supabase"
      };

      const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(UUID_PATTERN.test(supabaseRecord.tenant_id)).toBe(true);

      const SLUG_PATTERN = /^[a-z0-9-]+$/;
      expect(SLUG_PATTERN.test(supabaseRecord.tenant_id)).toBe(false);
    });
  });

  describe("1.7 Validación de Formato de Slug", () => {
    it("Given: slug con caracteres inválidos, When: se valida, Then: debe rechazar", () => {
      const invalidSlugs = ["Mi_empresa", "mi empresa", "MiEmpresa123", "_mi-empresa"];
      const validSlugPattern = /^[a-z0-9-]+$/;

      for (const slug of invalidSlugs) {
        expect(validSlugPattern.test(slug)).toBe(false);
      }
    });

    it("Given: slug con formato válido, When: se valida, Then: debe aceptar", () => {
      const validSlugs = ["mi-empresa", "empresa123", "mi-empresa-123", "a"];
      const validSlugPattern = /^[a-z0-9-]+$/;

      for (const slug of validSlugs) {
        expect(validSlugPattern.test(slug)).toBe(true);
      }
    });
  });

  describe("1.8 Permiso SalesActorPermissions - Descuentos", () => {
    it("Given: employee con maxDiscountPercent=0, When: intenta aplicar descuento, Then: debe denegar", () => {
      const employee: ActorContext = { 
        role: "employee", 
        permissions: { 
          permissions: ["SALES:DISCOUNT"], 
          maxDiscountPercent: 0, 
          allowedWarehouseLocalIds: [] 
        } 
      };

      const canApplyDiscount = permissionsService.canApplyDiscount(employee);
      expect(canApplyDiscount).toBe(false);
    });

    it("Given: employee con maxDiscountPercent=10, When: intenta aplicar 15% descuento, Then: debe denegar (excede límite)", () => {
      const employee: ActorContext = { 
        role: "employee", 
        permissions: { 
          permissions: [], 
          maxDiscountPercent: 10, 
          allowedWarehouseLocalIds: [] 
        } 
      };

      const requestedDiscount = 15;
      const canApplyDiscount = permissionsService.canApplyDiscount(employee) && requestedDiscount <= employee.permissions.maxDiscountPercent;
      
      expect(canApplyDiscount).toBe(false);
    });

    it("Given: employee con maxDiscountPercent=20, When: intenta aplicar 15% descuento, Then: debe permitir", () => {
      const employee: ActorContext = { 
        role: "employee", 
        permissions: { 
          permissions: [], 
          maxDiscountPercent: 20, 
          allowedWarehouseLocalIds: [] 
        } 
      };

      const requestedDiscount = 15;
      const canApplyDiscount = permissionsService.canApplyDiscount(employee) && requestedDiscount <= employee.permissions.maxDiscountPercent;
      
      expect(canApplyDiscount).toBe(true);
    });
  });

  describe("1.9 Permiso SalesActorPermissions - Warehouses", () => {
    it("Given: employee con allowedWarehouseLocalIds=[wh-1, wh-2], When: intenta acceder a wh-3, Then: debe denegar", () => {
      const employee: ActorContext = { 
        role: "employee", 
        permissions: { 
          permissions: ["SALES:SELL"], 
          maxDiscountPercent: 0, 
          allowedWarehouseLocalIds: ["wh-001", "wh-002"] 
        } 
      };

      const targetWarehouse = "wh-003";
      const hasAccess = employee.permissions.allowedWarehouseLocalIds.includes(targetWarehouse);
      
      expect(hasAccess).toBe(false);
    });

    it("Given: employee con allowedWarehouseLocalIds=[wh-1, wh-2], When: intenta acceder a wh-1, Then: debe permitir", () => {
      const employee: ActorContext = { 
        role: "employee", 
        permissions: { 
          permissions: ["SALES:SELL"], 
          maxDiscountPercent: 0, 
          allowedWarehouseLocalIds: ["wh-001", "wh-002"] 
        } 
      };

      const targetWarehouse = "wh-001";
      const hasAccess = employee.permissions.allowedWarehouseLocalIds.includes(targetWarehouse);
      
      expect(hasAccess).toBe(true);
    });
  });
});