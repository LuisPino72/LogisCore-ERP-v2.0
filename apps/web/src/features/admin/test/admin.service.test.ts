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

  describe.skip("createTenant - error handling", () => {
    it("debe manejar error al crear usuario", async () => {
      const supabase: any = {
        from: () => ({}),
        auth: {
          admin: {
            createUser: async () => ({ user: null, error: { message: "Error usuario" } })
          }
        }
      };
      const eventBus = createEventBusMock();
      const service = createAdminService({ supabase, eventBus: eventBus as any });

      const result = await service.createTenant({
        name: "Test",
        slug: "test",
        ownerEmail: "test@test.com"
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("ADMIN_CREATE_TENANT_USER_FAILED");
      }
    });

    it("debe manejar error al insertar tenant", async () => {
      const supabase: any = {
        from: (table: string) => {
          if (table === "tenants") {
            return {
              insert: () => ({ select: () => ({ single: async () => ({ data: null, error: { message: "Error al crear" } }) }) })
            };
          }
          if (table === "user_roles") {
            return { insert: () => ({ select: () => ({ single: async () => ({ data: {}, error: null }) }) }) };
          }
          return {};
        },
        auth: {}
      };
      (supabase as any).auth.admin = {
        createUser: async () => ({ user: { id: "123", email: "test@test.com" }, error: null })
      };
      const eventBus = createEventBusMock();
      const service = createAdminService({ supabase, eventBus: eventBus as any });

      const result = await service.createTenant({
        name: "Test",
        slug: "test",
        ownerEmail: "test@test.com"
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe("ADMIN_CREATE_TENANT_FAILED");
      }
    });
  });
});
