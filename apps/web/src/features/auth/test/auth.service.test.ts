import { describe, expect, it, vi } from "vitest";
import { InMemoryEventBus } from "@logiscore/core";
import { createAuthService, type AuthSupabaseLike } from "../services/auth.service";

const createSupabaseMock = (): AuthSupabaseLike => ({
  auth: {
    getSession: vi.fn(async () => ({
      data: { session: { user: { id: "user-1", email: "u@test.com" } } },
      error: null
    })),
    signOut: vi.fn(async () => ({ error: null }))
  }
});

describe("auth.service", () => {
  it("resuelve sesion activa", async () => {
    const service = createAuthService({
      supabase: createSupabaseMock(),
      eventBus: new InMemoryEventBus()
    });

    const result = await service.getActiveSession();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.userId).toBe("user-1");
    }
  });
});
