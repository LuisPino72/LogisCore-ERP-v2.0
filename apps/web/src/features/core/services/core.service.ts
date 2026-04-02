/**
 * Interfaz del servicio core.
 * Define las operaciones de negocio principales: bootstrap, sincronización y tenant.
 * Todas las funciones retornan Result<T, AppError> para manejo de errores.
 */

import { createAppError, err, ok, type AppError, type CoreDb, type EventBus, type Result, type SyncEngine, type SyncStatus } from "@logiscore/core";
import type { TenantContext } from "../types/core.types";

interface SupabaseSessionResponse {
  data: { session: { user: { id: string } } | null };
  error: { message: string } | null;
}

interface SupabaseRowResponse<T> {
  data: T | null;
  error: { message: string } | null;
}

export interface SupabaseLike {
  auth: {
    getSession: () => Promise<SupabaseSessionResponse>;
  };
  rpc: <T>(fn: string, args?: Record<string, unknown>) => Promise<SupabaseRowResponse<T>>;
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: <T>() => Promise<SupabaseRowResponse<T>>;
      };
    };
  };
}

export interface CoreService {
  bootstrapSession(): Promise<
    Result<
      {
        tenantContext: TenantContext;
        subscriptionActive: boolean;
      },
      AppError
    >
  >;
  resolveTenantContext(userId: string): Promise<Result<TenantContext, AppError>>;
  startSync(): Result<SyncStatus, AppError>;
  checkSubscription(tenantSlug: string): Promise<Result<boolean, AppError>>;
}

interface CoreServiceDependencies {
  db: CoreDb;
  syncEngine: SyncEngine;
  supabase: SupabaseLike;
  eventBus: EventBus;
  clock?: () => Date;
  uuid?: () => string;
}

export const createCoreService = ({
  db,
  syncEngine,
  supabase,
  eventBus,
  clock = () => new Date(),
  uuid = () => crypto.randomUUID()
}: CoreServiceDependencies): CoreService => {
  const resolveTenantContext: CoreService["resolveTenantContext"] = async (
    userId
  ) => {
    const tenantQuery = await supabase
      .from("tenants")
      .select("id, slug")
      .eq("owner_user_id", userId)
      .maybeSingle<{ id: string; slug: string }>();

    if (tenantQuery.error || !tenantQuery.data) {
      return err(
        createAppError({
          code: "TENANT_RESOLVE_FAILED",
          message:
            tenantQuery.error?.message ??
            "No se pudo resolver el tenant para el usuario.",
          retryable: false,
          context: { userId }
        })
      );
    }

    const tenantContext: TenantContext = {
      tenantUuid: tenantQuery.data.id,
      tenantSlug: tenantQuery.data.slug,
      userId
    };
    eventBus.emit("TENANT.RESOLVED", tenantContext);
    return ok(tenantContext);
  };

  const checkSubscription: CoreService["checkSubscription"] = async (
    tenantSlug
  ) => {
    const subscriptionQuery = await supabase.rpc<{
      isActive: boolean;
      status?: string;
    }>("check_subscriptions", {
      p_tenant_slug: tenantSlug
    });

    if (subscriptionQuery.error) {
      const tenantLookup = await supabase
        .from("tenants")
        .select("id")
        .eq("slug", tenantSlug)
        .maybeSingle<{ id: string }>();

      if (tenantLookup.error || !tenantLookup.data) {
        return err(
          createAppError({
            code: "SUBSCRIPTION_CHECK_FAILED",
            message: subscriptionQuery.error.message,
            retryable: true,
            context: { tenantSlug, fallback: "tenant_lookup_failed" }
          })
        );
      }

      const fallbackSubscription = await supabase
        .from("subscriptions")
        .select("status")
        .eq("tenant_id", tenantLookup.data.id)
        .maybeSingle<{ status: string }>();

      if (fallbackSubscription.error) {
        return err(
          createAppError({
            code: "SUBSCRIPTION_CHECK_FAILED",
            message: fallbackSubscription.error.message,
            retryable: true,
            context: { tenantSlug, fallback: "subscriptions_table_failed" }
          })
        );
      }

      const fallbackIsActive = fallbackSubscription.data?.status === "active";
      if (!fallbackIsActive) {
        eventBus.emit("SUBSCRIPTION.BLOCKED", { tenantSlug });
      }
      return ok(fallbackIsActive);
    }

    if (!subscriptionQuery.data || typeof subscriptionQuery.data.isActive !== "boolean") {
      return err(
        createAppError({
          code: "SUBSCRIPTION_RESPONSE_INVALID",
          message: "Respuesta invalida de check_subscriptions.",
          retryable: true,
          context: { tenantSlug }
        })
      );
    }

    const isActive = subscriptionQuery.data.isActive;
    if (!isActive) {
      eventBus.emit("SUBSCRIPTION.BLOCKED", { tenantSlug });
    }
    return ok(isActive);
  };

  const startSync: CoreService["startSync"] = () => {
    syncEngine.startPeriodicSync();
    const status = syncEngine.getStatus();
    return ok(status);
  };

  const bootstrapSession: CoreService["bootstrapSession"] = async () => {
    eventBus.emit("CORE.BOOTSTRAP_STARTED", {
      startedAt: clock().toISOString()
    });

    const sessionResponse = await supabase.auth.getSession();
    if (sessionResponse.error || !sessionResponse.data.session?.user.id) {
      const authError = createAppError({
        code: "AUTH_SESSION_MISSING",
        message:
          sessionResponse.error?.message ??
          "No hay una sesion valida para bootstrap.",
        retryable: false
      });
      eventBus.emit("CORE.BOOTSTRAP_FAILED", { error: authError });
      return err(authError);
    }

    const userId = sessionResponse.data.session.user.id;
    const tenantResult = await resolveTenantContext(userId);
    if (!tenantResult.ok) {
      eventBus.emit("CORE.BOOTSTRAP_FAILED", { error: tenantResult.error });
      return err(tenantResult.error);
    }

    const subscriptionResult = await checkSubscription(
      tenantResult.data.tenantSlug
    );
    if (!subscriptionResult.ok) {
      eventBus.emit("CORE.BOOTSTRAP_FAILED", { error: subscriptionResult.error });
      return err(subscriptionResult.error);
    }

    const queueResult = await syncEngine.enqueue({
      id: uuid(),
      table: "security_audit_log",
      operation: "create",
      payload: {
        eventType: "BOOTSTRAP",
        userId,
        tenantId: tenantResult.data.tenantSlug,
        success: true
      },
      localId: uuid(),
      tenantId: tenantResult.data.tenantSlug,
      createdAt: clock().toISOString(),
      attempts: 0
    });

    if (!queueResult.ok) {
      eventBus.emit("CORE.BOOTSTRAP_FAILED", { error: queueResult.error });
      return err(queueResult.error);
    }

    await db.saveBootstrapState({
      id: `${tenantResult.data.tenantSlug}:${userId}`,
      tenantId: tenantResult.data.tenantSlug,
      userId,
      bootstrappedAt: clock().toISOString()
    });

    eventBus.emit("SECURITY.AUDIT_LOG_REQUESTED", {
      eventType: "BOOTSTRAP",
      tenantId: tenantResult.data.tenantSlug
    });
    eventBus.emit("CORE.BOOTSTRAP_COMPLETED", {
      tenantSlug: tenantResult.data.tenantSlug
    });

    return ok({
      tenantContext: tenantResult.data,
      subscriptionActive: subscriptionResult.data
    });
  };

  return {
    bootstrapSession,
    resolveTenantContext,
    startSync,
    checkSubscription
  };
};
