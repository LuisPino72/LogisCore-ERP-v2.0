import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ok } from "@logiscore/core";
import { useCore } from "../hooks/useCore";
import type { CoreService } from "../services/core.service";

const createServiceMock = (active = true): CoreService => ({
  startSync: vi.fn(() => ok("idle")),
  resolveTenantContext: vi.fn(async () =>
    ok({ tenantUuid: "t-1", tenantSlug: "tenant-demo", tenantName: "Tenant Demo", userId: "u-1" })
  ),
  checkSubscription: vi.fn(async () => ok(active)),
  bootstrapSession: vi.fn(async () =>
    ok({
      tenantContext: {
        tenantUuid: "t-1",
        tenantSlug: "tenant-demo",
        tenantName: "Tenant Demo",
        userId: "u-1"
      },
      subscriptionActive: active
    })
  )
});

describe("useCore", () => {
  it("coordina estado de bootstrap y bloqueo", async () => {
    const service = createServiceMock(false);
    const { result } = renderHook(() => useCore({ service }));

    await act(async () => {
      await result.current.bootstrap();
    });

    expect(result.current.state.isBootstrapping).toBe(false);
    expect(result.current.state.isBlocked).toBe(true);
    expect(result.current.state.tenantSlug).toBe("tenant-demo");
  });
});
