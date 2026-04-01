import { createAppError, err, ok, type AppError, type EventBus, type Result } from "@logiscore/core";
import type {
  RolePermissions,
  TenantBootstrapResult,
  TenantContext,
  UserRole
} from "../types/tenant.types";

interface SupabaseRowResponse<T> {
  data: T | null;
  error: { message: string } | null;
}

interface SupabaseInvokeResponse<T> {
  data: T | null;
  error: { message: string } | null;
}

interface TenantSupabaseLike {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: <T>() => Promise<SupabaseRowResponse<T>>;
      };
    };
  };
  rpc: <T>(fn: string, args?: Record<string, unknown>) => Promise<SupabaseRowResponse<T>>;
  functions: {
    invoke: <T>(
      fn: string,
      options?: { body?: unknown }
    ) => Promise<SupabaseInvokeResponse<T>>;
  };
}

export interface TenantService {
  resolveTenantContext(userId: string): Promise<Result<TenantContext, AppError>>;
  resolveUserRole(userId: string): Promise<Result<UserRole, AppError>>;
  checkSubscription(tenantSlug: string): Promise<Result<boolean, AppError>>;
  bootstrapTenant(userId: string): Promise<Result<TenantBootstrapResult, AppError>>;
}

interface CreateTenantServiceDependencies {
  supabase: TenantSupabaseLike;
  eventBus: EventBus;
}

const defaultPermissions: RolePermissions = {
  canApplyDiscount: false,
  maxDiscountPercent: 0,
  canApplyCustomPrice: false,
  canVoidSale: false,
  canRefundSale: false,
  canVoidInvoice: false,
  canAdjustStock: false
};

export const createTenantService = ({
  supabase,
  eventBus
}: CreateTenantServiceDependencies): TenantService => {
  const resolveTenantContext: TenantService["resolveTenantContext"] = async (
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
            "No se pudo resolver tenant para la sesion actual.",
          retryable: false
        })
      );
    }

    const tenant = {
      tenantUuid: tenantQuery.data.id,
      tenantSlug: tenantQuery.data.slug,
      userId
    };
    eventBus.emit("TENANT.RESOLVED", tenant);
    return ok(tenant);
  };

  const resolveUserRole: TenantService["resolveUserRole"] = async (userId) => {
    const roleQuery = await supabase.rpc<{
      role: UserRole["role"];
      permissions: RolePermissions | null;
    }>("get_user_primary_role", {
      p_user_id: userId
    });

    if (roleQuery.error || !roleQuery.data) {
      return err(
        createAppError({
          code: "ROLE_RESOLVE_FAILED",
          message: roleQuery.error?.message ?? "No se pudo resolver el role.",
          retryable: false,
          context: { userId }
        })
      );
    }

    const userRole: UserRole = {
      role: roleQuery.data.role,
      permissions: roleQuery.data.permissions ?? defaultPermissions
    };
    eventBus.emit("AUTH.ROLE_DETECTED", {
      userId,
      role: userRole.role,
      permissions: userRole.permissions
    });
    return ok(userRole);
  };

  const checkSubscription: TenantService["checkSubscription"] = async (
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

  const bootstrapTenant: TenantService["bootstrapTenant"] = async (userId) => {
    const roleResult = await resolveUserRole(userId);
    if (!roleResult.ok) {
      return err(roleResult.error);
    }

    if (roleResult.data.role === "super_admin") {
      return ok({
        tenant: null,
        userRole: roleResult.data,
        subscriptionActive: true
      });
    }

    const tenantResult = await resolveTenantContext(userId);
    if (!tenantResult.ok) {
      return err(tenantResult.error);
    }

    const subscriptionResult = await checkSubscription(tenantResult.data.tenantSlug);
    if (!subscriptionResult.ok) {
      return err(subscriptionResult.error);
    }

    return ok({
      tenant: tenantResult.data,
      userRole: roleResult.data,
      subscriptionActive: subscriptionResult.data
    });
  };

  return {
    resolveTenantContext,
    resolveUserRole,
    checkSubscription,
    bootstrapTenant
  };
};
