import { describe, expect, it, vi } from "vitest";
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
}) => {
  const futureDate = new Date();
  futureDate.setMonth(futureDate.getMonth() + 1);
  
  const mock = {
    from: vi.fn((table: string) => ({
      select: vi.fn((_columns?: string) => ({
        eq: vi.fn((column: string, value: string) => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: table === "tenants" && column === "owner_user_id"
              ? { id: "tenant-uuid", slug: "tenant-demo", name: "Tenant Demo" }
              : table === "tenants" && column === "slug"
                ? { id: "tenant-uuid", slug: "tenant-demo", name: "Tenant Demo" }
                : table === "tenants" && column === "id"
                  ? { id: "tenant-uuid", slug: "tenant-demo", name: "Tenant Demo" }
                  : table === "user_roles" && column === "user_id"
                    ? { role: role }
                    : table === "subscriptions" && column === "tenant_id"
                      ? { status: subscriptionActive ? "active" : "inactive", end_date: futureDate.toISOString(), is_last_day: false }
                      : null,
            error: null
          })
        }))
      }))
    })),
    rpc: vi.fn((fn: string, _args?: Record<string, unknown>) => {
      if (fn === "get_user_primary_role_extended") {
        return Promise.resolve({
          data: {
            role,
            permissions: fullPermissions,
            email: "test@email.com",
            full_name: "Test User",
            last_login_at: null,
            is_active: true
          },
          error: null
        });
      }
      if (fn === "check_subscriptions") {
        return Promise.resolve({
          data: [{ is_active: subscriptionActive, status: subscriptionActive ? "active" : "inactive" }],
          error: null
        });
      }
      if (fn === "get_user_allowed_warehouses") {
        return Promise.resolve({
          data: [{ warehouse_local_id: "wh-1" }, { warehouse_local_id: "wh-2" }],
          error: null
        });
      }
      return Promise.resolve({
        data: null,
        error: { message: "RPC_NOT_MOCKED" }
      });
    }),
    functions: {
      invoke: vi.fn((_fn: string, _options?: { body?: unknown }) => {
        return Promise.resolve({
          data: { isActive: subscriptionActive },
          error: null
        });
      })
    }
  };
  return mock as any;
};

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
