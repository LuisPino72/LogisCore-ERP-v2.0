import { createAppError, err, ok, type AppError, type EventBus, type Result } from "@logiscore/core";
import type { AuthSession } from "../types/auth.types";

// Abstracción del cliente de autenticación
export interface AuthSupabaseLike {
  auth: {
    getSession: () => Promise<{ data: { session: { user: { id: string; email?: string } } | null }; error: { message: string } | null }>;
    signInWithPassword: (options: { email: string; password: string }) => Promise<{ data: { session: { user: { id: string; email?: string } } | null } | null; error: { message: string } | null }>;
    signOut: () => Promise<{ error: { message: string } | null }>;
    resetPasswordForEmail: (email: string, options?: { redirectTo?: string }) => Promise<{ data: unknown; error: { message: string } | null }>;
    updateUser: (options: { password: string }) => Promise<{ data: unknown; error: { message: string } | null }>;
  };
  from: (table: string) => {
    insert: (data: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
  };
}

// Contrato del servicio de autenticación
export interface AuthService {
  getActiveSession(): Promise<Result<AuthSession, AppError>>; // Obtener sesión activa
  signIn(email: string, password: string): Promise<Result<AuthSession, AppError>>; // Iniciar sesión
  signOut(): Promise<Result<void, AppError>>; // Cerrar sesión
  resetPassword(email: string): Promise<Result<void, AppError>>; // Recuperar contraseña
  updatePassword(password: string): Promise<Result<void, AppError>>; // Actualizar contraseña
  logAuditEvent(action: string, userId: string | null, email: string | null): Promise<Result<void, AppError>>; // Registrar evento de auditoría
}

// Dependencias necesarias para crear el servicio
interface CreateAuthServiceDependencies {
  supabase: AuthSupabaseLike; // Cliente de auth
  eventBus: EventBus; // Bus de eventos para emitir estados
}

// Factory que crea el servicio de autenticación
export const createAuthService = ({
  supabase,
  eventBus
}: CreateAuthServiceDependencies): AuthService => ({

  // Obtiene la sesión actual del usuario
  async getActiveSession() {
    const sessionResponse = await supabase.auth.getSession();

    // Manejo de error o sesión inexistente
    if (sessionResponse.error || !sessionResponse.data?.session) {
      const authError = createAppError({
        code: "AUTH_SESSION_MISSING",
        message:
          sessionResponse.error?.message ?? "Sesion no disponible para el usuario.",
        retryable: false
      });

      // Emitir evento de error
      eventBus.emit("AUTH.SESSION_MISSING", { error: authError });
      return err(authError);
    }

    // Construcción del objeto de sesión
    const session: AuthSession = {
      userId: sessionResponse.data.session.user.id,
      ...(sessionResponse.data.session.user.email && { email: sessionResponse.data.session.user.email })
    };

    // Emitir evento de éxito
    eventBus.emit("AUTH.SESSION_RESOLVED", session);
    return ok(session);
  },

  // Inicia sesión con email y password
  async signIn(email: string, password: string) {
    const signInResponse = await supabase.auth.signInWithPassword({
      email,
      password
    });

    // Manejo de error o credenciales inválidas
    if (signInResponse.error || !signInResponse.data?.session) {
      const authError = createAppError({
        code: "AUTH_SIGNIN_FAILED",
        message: signInResponse.error?.message ?? "Credenciales inválidas.",
        retryable: false
      });

      // Emitir evento de fallo
      eventBus.emit("AUTH.SIGNIN_FAILED", { error: authError });

      // Registrar intento fallido en auditoría
      await this.logAuditEvent("LOGIN_FAILED", null, email);

      return err(authError);
    }

    // Construcción de la sesión
    const session: AuthSession = {
      userId: signInResponse.data.session.user.id,
      ...(signInResponse.data.session.user.email && { email: signInResponse.data.session.user.email })
    };

    // Emitir evento de éxito
    eventBus.emit("AUTH.SIGNIN_SUCCESS", session);

    // Registrar login exitoso en auditoría
    await this.logAuditEvent("LOGIN", signInResponse.data.session.user.id, email);

    return ok(session);
  },

  // Registra evento de auditoría
  async logAuditEvent(action: string, userId: string | null, email: string | null): Promise<Result<void, AppError>> {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !anonKey) {
        return ok(undefined);
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/audit-log-v2`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${anonKey}`
        },
        body: JSON.stringify({ action, userId, email })
      }).catch(() => null);

      if (!response || !response.ok) {
        return ok(undefined);
      }

      return ok(undefined);
    } catch {
      return ok(undefined);
    }
  },

  // Cierra la sesión del usuario
  async signOut() {
    const response = await supabase.auth.signOut();

    // Manejo de error al cerrar sesión
    if (response.error) {
      return err(
        createAppError({
          code: "AUTH_SIGNOUT_FAILED",
          message: response.error.message,
          retryable: true
        })
      );
    }

    // Emitir evento de logout exitoso
    eventBus.emit("AUTH.SIGNED_OUT", {});
    return ok<void>(undefined);
  },

  // Recupera la contraseña del usuario
  async resetPassword(email: string) {
    const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    const response = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${baseUrl}?resetPassword=true`
    });

    if (response.error) {
      return err(
        createAppError({
          code: "AUTH_RESET_PASSWORD_FAILED",
          message: response.error.message,
          retryable: true
        })
      );
    }

    eventBus.emit("AUTH.RESET_PASSWORD_SENT", { email });
    return ok<void>(undefined);
  },

  // Actualiza la contraseña del usuario
  async updatePassword(password: string): Promise<Result<void, AppError>> {
    const response = await supabase.auth.updateUser({ password });

    if (response.error) {
      const authError = createAppError({
        code: "AUTH_UPDATE_PASSWORD_FAILED",
        message: response.error.message,
        retryable: false
      });
      eventBus.emit("AUTH.PASSWORD_UPDATE_FAILED", { error: authError });
      return err(authError);
    }

    eventBus.emit("AUTH.PASSWORD_UPDATED", {});
    return ok(undefined);
  }
});