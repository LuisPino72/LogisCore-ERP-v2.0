import { describe, expect, it } from "vitest";
import { InMemoryEventBus } from "@logiscore/core";
import { createTenantService } from "../services/tenant.service";
import type { RolePermissions, UserRole } from "../types/tenant.types";

const fullPermissions: RolePermissions = {
  canApplyDiscount: true,
  maxDiscountPercent: 15,
  canApplyCustomPrice: false,
  canVoidSale: false,
  canRefundSale: false,
  canVoidInvoice: false,
  canAdjustStock: false,
  canViewReports: true,
  canExportReports: true,
  allowedWarehouseLocalIds: []
};

const createSupabaseMock = ({
  role = "owner",
  subscriptionActive = true
}: {
  role?: UserRole["role"];
  subscriptionActive?: boolean;
}) => ({
  from: (table: string) => ({
    select: (columns: string) => ({
      eq: (column: string, value: string) => ({
        maybeSingle: async <T>() => {
          void columns;
          void column;
          void value;
          if (table === "tenants") {
            if (column === "owner_user_id") {
              return {
                data: { id: "tenant-uuid", slug: "tenant-demo" } as T,
                error: null
              };
            }
            if (column === "slug") {
              return {
                data: { id: "tenant-uuid" } as T,
                error: null
              };
            }
          }
          if (table === "subscriptions") {
            return {
              data: { status: subscriptionActive ? "active" : "inactive" } as T,
              error: null
            };
          }
          return { data: null, error: null };
        }
      })
    })
  }),
  rpc: async <T>(fn: string, args?: Record<string, unknown>) => {
    void args;
    if (fn === "get_user_primary_role_extended") {
      return {
        data: {
          role,
          permissions: fullPermissions,
          email: "test@email.com",
          full_name: "Test User",
          last_login_at: null,
          is_active: true
        } as T,
        error: null
      };
    }
    if (fn === "check_subscriptions") {
      return {
        data: { isActive: subscriptionActive, status: subscriptionActive ? "active" : "inactive" } as T,
        error: null
      };
    }
    if (fn === "get_user_allowed_warehouses") {
      return {
        data: [{ warehouse_local_id: "wh-1" }, { warehouse_local_id: "wh-2" }] as T,
        error: null
      };
    }
    return {
      data: null,
      error: { message: "RPC_NOT_MOCKED" }
    };
  },
  functions: {
    invoke: async <T>(_fn: string, _options?: { body?: unknown }) => {
      void _fn;
      void _options;
      return {
        data: { isActive: subscriptionActive } as T,
        error: null
      };
    }
  }
});

describe("tenant.service", () => {
  it("resuelve bootstrap owner con tenant y suscripcion activa", async () => {
    const service = createTenantService({
      eventBus: new InMemoryEventBus(),
      supabase: createSupabaseMock({ role: "owner", subscriptionActive: true })
    });

    const result = await service.bootstrapTenant("user-1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.userRole.role).toBe("owner");
      expect(result.data.userRole.permissions.allowedWarehouseLocalIds).toEqual([
        "wh-1",
        "wh-2"
      ]);
      expect(result.data.tenant?.tenantSlug).toBe("tenant-demo");
      expect(result.data.subscriptionActive).toBe(true);
    }
  });

  it("resuelve bootstrap employee y bloquea por suscripcion inactiva", async () => {
    const service = createTenantService({
      eventBus: new InMemoryEventBus(),
      supabase: createSupabaseMock({
        role: "employee",
        subscriptionActive: false
      })
    });

    const result = await service.bootstrapTenant("user-2");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.userRole.role).toBe("employee");
      expect(result.data.subscriptionActive).toBe(false);
      expect(result.data.tenant?.tenantSlug).toBe("tenant-demo");
    }
  });

  it("resuelve bootstrap admin sin tenant", async () => {
    const service = createTenantService({
      eventBus: new InMemoryEventBus(),
      supabase: createSupabaseMock({
        role: "admin",
        subscriptionActive: true
      })
    });

    const result = await service.bootstrapTenant("user-admin");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.userRole.role).toBe("admin");
      expect(result.data.tenant).toBeNull();
      expect(result.data.subscriptionActive).toBe(true);
    }
  });
});
