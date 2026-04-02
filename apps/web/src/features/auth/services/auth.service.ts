import { createAppError, err, ok, type AppError, type EventBus, type Result } from "@logiscore/core";
import type { AuthSession } from "../types/auth.types";

// Respuesta de Supabase al obtener sesión actual
interface SupabaseAuthSessionResponse {
  data: {
    session: { user: { id: string; email?: string } } | null;
  };
  error: { message: string } | null;
}

// Respuesta de Supabase al iniciar sesión
interface SupabaseSignInResponse {
  data: { session: { user: { id: string; email?: string } } | null } | null;
  error: { message: string } | null;
}

// Respuesta de Supabase al cerrar sesión
interface SupabaseSignOutResponse {
  error: { message: string } | null;
}

// Respuesta de Supabase al recuperar contraseña
interface SupabaseResetPasswordResponse {
  data: unknown;
  error: { message: string } | null;
}

// Abstracción del cliente de autenticación (tipo Supabase)
export interface AuthSupabaseLike {
  auth: {
    getSession: () => Promise<SupabaseAuthSessionResponse>;
    signInWithPassword: (options: { email: string; password: string }) => Promise<SupabaseSignInResponse>;
    signOut: () => Promise<SupabaseSignOutResponse>;
    resetPasswordForEmail: (email: string, options?: { redirectTo?: string }) => Promise<SupabaseResetPasswordResponse>;
  };
}

// Contrato del servicio de autenticación
export interface AuthService {
  getActiveSession(): Promise<Result<AuthSession, AppError>>; // Obtener sesión activa
  signIn(email: string, password: string): Promise<Result<AuthSession, AppError>>; // Iniciar sesión
  signOut(): Promise<Result<void, AppError>>; // Cerrar sesión
  resetPassword(email: string): Promise<Result<void, AppError>>; // Recuperar contraseña
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
      return err(authError);
    }

    // Construcción de la sesión
    const session: AuthSession = {
      userId: signInResponse.data.session.user.id,
      ...(signInResponse.data.session.user.email && { email: signInResponse.data.session.user.email })
    };

    // Emitir evento de éxito
    eventBus.emit("AUTH.SIGNIN_SUCCESS", session);
    return ok(session);
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
    const redirectUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    const response = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${redirectUrl}/?resetPassword=true`
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
  }
});