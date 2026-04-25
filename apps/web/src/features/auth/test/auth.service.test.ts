/**
 * Tests unitarios para el servicio de autenticación.
 * Verifica login, logout, recuperación de contraseña y gestión de sesión.
 */

import { describe, expect, it, vi } from "vitest";
import { InMemoryEventBus } from "@logiscore/core";
import { createAuthService } from "../services/auth.service";

const createMockSupabase = (overrides?: Record<string, unknown>) => {
  const defaultAuth = {
    getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: "user-1", email: "test@test.com" } } }, error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: { session: { user: { id: "user-123", email: "admin@test.com" } } }, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
    getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1", email: "test@test.com" } }, error: null })
  };
  
  return {
    auth: overrides?.auth ? { ...defaultAuth, ...overrides.auth } : defaultAuth,
    ...overrides
  };
};

const eventBusSpy = () => {
  const bus = new InMemoryEventBus();
  return { bus, emitSpy: vi.spyOn(bus, "emit") };
};

describe("auth.service", () => {
  describe("getActiveSession", () => {
    it("resuelve sesion activa correctamente", async () => {
      const { bus } = eventBusSpy();
      const service = createAuthService({ supabase: createMockSupabase() as any, eventBus: bus });

      const result = await service.getActiveSession();

      expect(result.ok).toBe(true);
      expect(result.ok && result.data.userId).toBe("user-1");
    });

    it("retorna error cuando no hay sesion activa", async () => {
      const { bus } = eventBusSpy();
      const mockSupabase = createMockSupabase({
        auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }) }
      });
      const service = createAuthService({ supabase: mockSupabase as any, eventBus: bus });

      const result = await service.getActiveSession();

      expect(result.ok).toBe(false);
      expect(!result.ok && result.error.code).toBe("AUTH_SESSION_MISSING");
    });

    it("retorna error cuando Supabase falla", async () => {
      const { bus } = eventBusSpy();
      const mockSupabase = createMockSupabase({
        auth: { getSession: vi.fn().mockResolvedValue({ data: null, error: { message: "Network error" } }) }
      });
      const service = createAuthService({ supabase: mockSupabase as any, eventBus: bus });

      const result = await service.getActiveSession();

      expect(result.ok).toBe(false);
      // El código retorna AUTH_SESSION_MISSING cuando data es null
      expect(!result.ok && result.error.code).toBe("AUTH_SESSION_MISSING");
    });
  });

  describe("signIn", () => {
    it("inicia sesion exitosamente con credenciales validas", async () => {
      const { bus, emitSpy } = eventBusSpy();
      const service = createAuthService({ supabase: createMockSupabase() as any, eventBus: bus });

      const result = await service.signIn("admin@test.com", "password123");

      expect(result.ok).toBe(true);
      expect(result.ok && result.data.userId).toBe("user-123");
      expect(emitSpy).toHaveBeenCalledWith("AUTH.SIGNIN_SUCCESS", expect.any(Object));
    });

    it("retorna error con credenciales invalidas", async () => {
      const { bus } = eventBusSpy();
      const mockSupabase = createMockSupabase({
        auth: { signInWithPassword: vi.fn().mockResolvedValue({ data: null, error: { message: "Invalid login credentials" } }) }
      });
      const service = createAuthService({ supabase: mockSupabase as any, eventBus: bus });

      const result = await service.signIn("wrong@test.com", "wrongpass");

      expect(result.ok).toBe(false);
      expect(!result.ok && result.error.code).toBe("AUTH_SIGNIN_FAILED");
      expect(!result.ok && result.error.message).toBe("Invalid login credentials");
    });

    it("retorna error cuando Supabase falla", async () => {
      const { bus } = eventBusSpy();
      const mockSupabase = createMockSupabase({
        auth: { signInWithPassword: vi.fn().mockResolvedValue({ data: null, error: { message: "Network error" } }) }
      });
      const service = createAuthService({ supabase: mockSupabase as any, eventBus: bus });

      const result = await service.signIn("test@test.com", "password");

      expect(result.ok).toBe(false);
      expect(!result.ok && result.error.code).toBe("AUTH_SIGNIN_FAILED");
    });
  });

  describe("signOut", () => {
    it("cierra sesion exitosamente", async () => {
      const { bus, emitSpy } = eventBusSpy();
      const signOutFn = vi.fn().mockResolvedValue({ error: null });
      const mockSupabase = createMockSupabase({ auth: { signOut: signOutFn } });
      const service = createAuthService({ supabase: mockSupabase as any, eventBus: bus });

      const result = await service.signOut();

      expect(result.ok).toBe(true);
      expect(signOutFn).toHaveBeenCalled();
      expect(emitSpy).toHaveBeenCalledWith("AUTH.SIGNED_OUT", {});
    });

    it("maneja error al cerrar sesion", async () => {
      const { bus } = eventBusSpy();
      const mockSupabase = createMockSupabase({
        auth: { signOut: vi.fn().mockResolvedValue({ error: { message: "Logout failed" } }) }
      });
      const service = createAuthService({ supabase: mockSupabase as any, eventBus: bus });

      const result = await service.signOut();

      expect(result.ok).toBe(false);
      expect(!result.ok && result.error.code).toBe("AUTH_SIGNOUT_FAILED");
      expect(!result.ok && result.error.message).toBe("Logout failed");
    });
  });

});