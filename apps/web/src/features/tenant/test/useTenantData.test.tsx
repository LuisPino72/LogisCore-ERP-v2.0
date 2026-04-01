import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ok } from "@logiscore/core";
import { useTenantData } from "../hooks/useTenantData";

describe("useTenantData", () => {
  it("coordina bootstrap tenant+roles+suscripcion", async () => {
    const auth = {
      getActiveSession: vi.fn(async () => ok({ userId: "u-1" })),
      signOut: vi.fn(async () => ok<void>(undefined))
    };
    const tenant = {
      resolveTenantContext: vi.fn(),
      resolveUserRole: vi.fn(),
      checkSubscription: vi.fn(),
      bootstrapTenant: vi.fn(async () =>
        ok({
          tenant: {
            tenantUuid: "t-1",
            tenantSlug: "tenant-demo",
            userId: "u-1"
          },
          userRole: {
            role: "owner" as const,
            permissions: {
              canApplyDiscount: true,
              maxDiscountPercent: 10,
              canApplyCustomPrice: false,
              canVoidSale: false,
              canRefundSale: false,
              canVoidInvoice: false,
              canAdjustStock: false
            }
          },
          subscriptionActive: true
        })
      )
    };

    const { result } = renderHook(() => useTenantData({ auth, tenant }));
    await act(async () => {
      await result.current.bootstrapTenantData();
    });

    expect(result.current.state.tenant?.tenantSlug).toBe("tenant-demo");
    expect(result.current.state.userRole?.role).toBe("owner");
    expect(result.current.state.isBlocked).toBe(false);
  });
});
