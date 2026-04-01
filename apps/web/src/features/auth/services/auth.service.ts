import { createAppError, err, ok, type AppError, type EventBus, type Result } from "@logiscore/core";
import type { AuthSession } from "../types/auth.types";

interface SupabaseAuthSessionResponse {
  data: {
    session: { user: { id: string; email?: string } } | null;
  };
  error: { message: string } | null;
}

interface SupabaseSignOutResponse {
  error: { message: string } | null;
}

export interface AuthSupabaseLike {
  auth: {
    getSession: () => Promise<SupabaseAuthSessionResponse>;
    signOut: () => Promise<SupabaseSignOutResponse>;
  };
}

export interface AuthService {
  getActiveSession(): Promise<Result<AuthSession, AppError>>;
  signOut(): Promise<Result<void, AppError>>;
}

interface CreateAuthServiceDependencies {
  supabase: AuthSupabaseLike;
  eventBus: EventBus;
}

export const createAuthService = ({
  supabase,
  eventBus
}: CreateAuthServiceDependencies): AuthService => ({
  async getActiveSession() {
    const sessionResponse = await supabase.auth.getSession();
    if (sessionResponse.error || !sessionResponse.data.session) {
      const authError = createAppError({
        code: "AUTH_SESSION_MISSING",
        message:
          sessionResponse.error?.message ?? "Sesion no disponible para el usuario.",
        retryable: false
      });
      eventBus.emit("AUTH.SESSION_MISSING", { error: authError });
      return err(authError);
    }

    const session: AuthSession = {
      userId: sessionResponse.data.session.user.id,
      email: sessionResponse.data.session.user.email
    };
    eventBus.emit("AUTH.SESSION_RESOLVED", session);
    return ok(session);
  },

  async signOut() {
    const response = await supabase.auth.signOut();
    if (response.error) {
      return err(
        createAppError({
          code: "AUTH_SIGNOUT_FAILED",
          message: response.error.message,
          retryable: true
        })
      );
    }
    eventBus.emit("AUTH.SIGNED_OUT", {});
    return ok<void>(undefined);
  }
});
