/**
 * Tests unitarios para el servicio de admin.
 * Verifica el comportamiento de las operaciones CRUD básicas del admin service.
 */

import { describe, expect, it, vi } from "vitest";
import { createAdminService } from "../services/admin.service";

/** Mock de EventBus */
const createEventBusMock = () => ({
  emit: vi.fn(),
  subscribe: vi.fn(() => vi.fn())
});

describe("AdminService", () => {
  describe("toggleUserStatus", () => {
    it("debe cambiar estado de usuario", async () => {
      const supabase: any = {
        from: () => ({
          update: () => ({ eq: () => Promise.resolve({ error: null }) })
        })
      };
      const eventBus = createEventBusMock();
      const service = createAdminService({ supabase, eventBus: eventBus as any });

      const result = await service.toggleUserStatus("user-123", false);

      expect(result.ok).toBe(true);
    });

    it("debe manejar error al cambiar estado", async () => {
      const supabase: any = {
        from: () => ({ update: () => ({ eq: () => Promise.resolve({ error: { message: "Error" } }) }) })
      };
      const eventBus = createEventBusMock();
      const service = createAdminService({ supabase, eventBus: eventBus as any });

      const result = await service.toggleUserStatus("user-123", false);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("ADMIN_TOGGLE_USER_STATUS_FAILED");
      }
    });
  });

  describe("deleteTenant", () => {
    it("debe eliminar tenant", async () => {
      const supabase: any = {
        from: () => ({ delete: () => ({ eq: () => Promise.resolve({ error: null }) }) })
      };
      const eventBus = createEventBusMock();
      const service = createAdminService({ supabase, eventBus: eventBus as any });

      const result = await service.deleteTenant("tenant-123");

      expect(result.ok).toBe(true);
    });

    it("debe manejar error al eliminar tenant", async () => {
      const supabase: any = {
        from: () => ({ delete: () => ({ eq: () => Promise.resolve({ error: { message: "Error al eliminar" } }) }) })
      };
      const eventBus = createEventBusMock();
      const service = createAdminService({ supabase, eventBus: eventBus as any });

      const result = await service.deleteTenant("tenant-123");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("ADMIN_DELETE_TENANT_FAILED");
      }
    });
  });

  describe("deleteBusinessType", () => {
    it("debe eliminar tipo de negocio", async () => {
      const supabase: any = {
        from: () => ({ delete: () => ({ eq: () => Promise.resolve({ error: null }) }) })
      };
      const eventBus = createEventBusMock();
      const service = createAdminService({ supabase, eventBus: eventBus as any });

      const result = await service.deleteBusinessType("bt-123");

      expect(result.ok).toBe(true);
    });

    it("debe manejar error al eliminar tipo de negocio", async () => {
      const supabase: any = {
        from: () => ({ delete: () => ({ eq: () => Promise.resolve({ error: { message: "Error" } }) }) })
      };
      const eventBus = createEventBusMock();
      const service = createAdminService({ supabase, eventBus: eventBus as any });

      const result = await service.deleteBusinessType("bt-123");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("ADMIN_DELETE_BUSINESS_TYPE_FAILED");
      }
    });
  });

  describe("updateTenant", () => {
    it("debe actualizar tenant", async () => {
      const supabase: any = {
        from: () => ({
          update: () => ({
            eq: () => ({
              select: () => ({
                single: async () => ({
                  data: { id: "1", name: "Updated", slug: "updated", owner_user_id: "u1", is_active: true },
                  error: null
                })
              })
            })
          })
        })
      };
      const eventBus = createEventBusMock();
      const service = createAdminService({ supabase, eventBus: eventBus as any });

      const result = await service.updateTenant("1", { name: "Updated" });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.name).toBe("Updated");
      }
    });

    it("debe manejar error al actualizar tenant", async () => {
      const supabase: any = {
        from: () => ({
          update: () => ({
            eq: () => ({
              select: () => ({
                single: async () => ({ data: null, error: { message: "Error al actualizar" } })
              })
            })
          })
        })
      };
      const eventBus = createEventBusMock();
      const service = createAdminService({ supabase, eventBus: eventBus as any });

      const result = await service.updateTenant("1", { name: "Updated" });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("ADMIN_UPDATE_TENANT_FAILED");
      }
    });
  });

  describe("createTenant - error handling", () => {
    it("debe manejar error al crear usuario", async () => {
      const createUserFn = vi.fn().mockResolvedValue({ user: null, error: { message: "Error al crear usuario" } });
      const supabase: any = {
        from: () => ({}),
        auth: {
          admin: {
            createUser: createUserFn
          }
        }
      };
      const eventBus = createEventBusMock();
      const service = createAdminService({ supabase, eventBus: eventBus as any });

      const result = await service.createTenant({
        name: "Test",
        slug: "test",
        ownerEmail: "test@test.com",
        planId: "plan-123"
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("ADMIN_CREATE_TENANT_USER_FAILED");
      }
      expect(createUserFn).toHaveBeenCalled();
    });

    it("debe manejar error al insertar tenant", async () => {
      const mockAdminCreateUser = vi.fn().mockResolvedValue({ 
        data: { user: { id: "123", email: "test@test.com" } }, 
        error: null 
      });
      const supabase: any = {
        from: vi.fn((table: string) => {
          if (table === "tenants") {
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: null, error: { message: "Error al crear tenant" } })
                })
              })
            };
          }
          if (table === "user_roles") {
            return {
              insert: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: {}, error: null })
                })
              })
            };
          }
          return {};
        }),
        auth: {
          admin: {
            createUser: mockAdminCreateUser
          }
        }
      };
      const eventBus = createEventBusMock();
      const service = createAdminService({ supabase, eventBus: eventBus as any });

      const result = await service.createTenant({
        name: "Test",
        slug: "test",
        ownerEmail: "test@test.com",
        planId: "plan-123"
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("ADMIN_CREATE_TENANT_FAILED");
      }
    });
  });

  describe("getDashboardStats", () => {
    it("retorna estadisticas correctas del dashboard", async () => {
      const supabase: any = {
        from: (table: string) => {
          if (table === "tenants") {
            return {
              select: () => Promise.resolve({
                data: [
                  { id: "1", is_active: true },
                  { id: "2", is_active: true },
                  { id: "3", is_active: false }
                ],
                error: null
              })
            };
          }
          if (table === "user_roles") {
            return {
              select: () => Promise.resolve({
                data: [
                  { id: "1", is_active: true },
                  { id: "2", is_active: true },
                  { id: "3", is_active: false }
                ],
                error: null
              })
            };
          }
          if (table === "subscriptions") {
            return {
              select: () => Promise.resolve({
                data: [
                  { status: "active" },
                  { status: "active" },
                  { status: "cancelled" }
                ],
                error: null
              })
            };
          }
          return { select: () => Promise.resolve({ data: [], error: null }) };
        }
      };
      const eventBus = createEventBusMock();
      const service = createAdminService({ supabase, eventBus: eventBus as any });

      const result = await service.getDashboardStats();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.totalTenants).toBe(3);
        expect(result.data.activeTenants).toBe(2);
        expect(result.data.totalUsers).toBe(3);
        expect(result.data.activeSubscriptions).toBe(2);
      }
    });

    it("maneja error al obtener stats", async () => {
      const supabase: any = {
        from: () => ({ select: () => Promise.resolve({ data: null, error: { message: "DB Error" } }) })
      };
      const eventBus = createEventBusMock();
      const service = createAdminService({ supabase, eventBus: eventBus as any });

      const result = await service.getDashboardStats();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("ADMIN_DASHBOARD_STATS_FAILED");
      }
    });
  });

  describe("listTenants", () => {
    it("lista tenants correctamente con business types", async () => {
      const supabase: any = {
        from: () => ({
          select: () => Promise.resolve({
            data: [
              {
                id: "tenant-1",
                name: "Empresa 1",
                slug: "empresa-1",
                owner_user_id: "user-1",
                business_type_id: "bt-1",
                business_types: { name: "Tienda" },
                is_active: true,
                logo_url: "https://example.com/logo.png",
                contact_email: "contact@empresa1.com",
                phone: "04121234567",
                address: "Direccion 1",
                timezone: "America/Caracas",
                currency: "VES",
                created_at: "2026-01-01T00:00:00Z"
              },
              {
                id: "tenant-2",
                name: "Empresa 2",
                slug: "empresa-2",
                owner_user_id: "user-2",
                business_type_id: null,
                business_types: null,
                is_active: false,
                logo_url: null,
                contact_email: null,
                phone: null,
                address: null,
                timezone: "America/Caracas",
                currency: "USD",
                created_at: "2026-01-02T00:00:00Z"
              }
            ],
            error: null
          })
        })
      };
      const eventBus = createEventBusMock();
      const service = createAdminService({ supabase, eventBus: eventBus as any });

      const result = await service.listTenants();

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0].name).toBe("Empresa 1");
        expect(result.data[0].businessTypeName).toBe("Tienda");
        expect(result.data[0].logoUrl).toBe("https://example.com/logo.png");
        expect(result.data[1].isActive).toBe(false);
      }
    });

    it("maneja error al listar tenants", async () => {
      const supabase: any = {
        from: () => ({ select: () => Promise.resolve({ data: null, error: { message: "Error de DB" } }) })
      };
      const eventBus = createEventBusMock();
      const service = createAdminService({ supabase, eventBus: eventBus as any });

      const result = await service.listTenants();

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("ADMIN_LIST_TENANTS_FAILED");
      }
    });
  });
});
