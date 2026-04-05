/**
 * Interfaz del servicio de tenant.
 * Define todas las operaciones de negocio relacionadas con tenants.
 * Todas las funciones retornan Result<T, AppError> para manejo de errores.
 */

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
        order: (column: string, options?: { ascending: boolean }) => {
          limit: (n: number) => {
            maybeSingle: <T>() => Promise<SupabaseRowResponse<T>>;
          };
          maybeSingle: <T>() => Promise<SupabaseRowResponse<T>>;
        };
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
  checkSubscription(tenantSlug: string): Promise<Result<{ isActive: boolean; endDate: string | null; isLastDay: boolean }, AppError>>;
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
  canAdjustStock: false,
  canViewReports: false,
  canExportReports: false
};

export const createTenantService = ({
  supabase,
  eventBus
}: CreateTenantServiceDependencies): TenantService => {
  const resolveAllowedWarehouses = async (
    userId: string
  ): Promise<Result<string[], AppError>> => {
    const roleQuery = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle<{ role: string }>();
    
    const userRole = roleQuery.data?.role?.trim().toLowerCase();
    
    if (userRole === "admin") {
      return ok([]);
    }

    const warehouseAccess = await supabase.rpc<
      { warehouse_local_id: string }[]
    >("get_user_allowed_warehouses", {
      p_user_id: userId
    });

    if (warehouseAccess.error) {
      return err(
        createAppError({
          code: "WAREHOUSE_ACCESS_RESOLVE_FAILED",
          message: warehouseAccess.error.message,
          retryable: true,
          context: { userId }
        })
      );
    }

    const ids = Array.isArray(warehouseAccess.data)
      ? warehouseAccess.data
          .map((item) => item.warehouse_local_id)
          .filter((item): item is string => Boolean(item))
      : [];

    return ok(ids);
  };

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
    const roleQuery = await supabase
      .from("user_roles")
      .select("role, permissions, email, full_name, last_login_at, is_active, tenant_id")
      .eq("user_id", userId)
      .maybeSingle<{
        role: string;
        permissions: RolePermissions | null;
        email: string;
        full_name: string;
        last_login_at: string | null;
        is_active: boolean;
        tenant_id: string | null;
      }>();

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

    const basePermissions = roleQuery.data.permissions ?? defaultPermissions;
    const warehouseAccessResult = await resolveAllowedWarehouses(userId);
    if (!warehouseAccessResult.ok) {
      return err(warehouseAccessResult.error);
    }

    const userRole: UserRole = {
      role: roleQuery.data.role as UserRole["role"],
      permissions: {
        ...basePermissions,
        allowedWarehouseLocalIds: warehouseAccessResult.data
      },
      email: roleQuery.data.email,
      fullName: roleQuery.data.full_name,
      lastLoginAt: roleQuery.data.last_login_at ?? null,
      isActive: roleQuery.data.is_active
    };
    eventBus.emit("AUTH.WAREHOUSE_ACCESS_RESOLVED", {
      userId,
      allowedWarehouseLocalIds: userRole.permissions.allowedWarehouseLocalIds
    });
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
    const subscriptionQuery = await supabase.rpc<
      {
        is_active: boolean;
        status?: string;
        end_date?: string;
        is_last_day?: boolean;
      }[]
    >("check_subscriptions", {
      p_tenant_slug: tenantSlug
    });

    if (subscriptionQuery.error || !subscriptionQuery.data) {
      const tenantLookup = await supabase
        .from("tenants")
        .select("id")
        .eq("slug", tenantSlug)
        .maybeSingle<{ id: string }>();

      if (tenantLookup.error || !tenantLookup.data) {
        return err(
          createAppError({
            code: "SUBSCRIPTION_CHECK_FAILED",
            message: subscriptionQuery.error?.message ?? "Unknown error",
            retryable: true,
            context: { tenantSlug, fallback: "tenant_lookup_failed" }
          })
        );
      }

      const fallbackSubscription = await supabase
        .from("subscriptions")
        .select("end_date, status")
        .eq("tenant_id", tenantLookup.data.id)
        .order("end_date", { ascending: false })
        .limit(1)
        .maybeSingle<{ end_date: string; status: string }>();

      const endDate = fallbackSubscription?.data?.end_date;
      const today = new Date();
      const expirationDate = endDate ? new Date(endDate) : null;
      const isLastDay = expirationDate
        ? expirationDate.toDateString() === today.toDateString()
        : false;
      const isExpired = expirationDate ? expirationDate < today : true;

      if (!fallbackSubscription.data || fallbackSubscription.error) {
        return ok({
          isActive: false,
          endDate: endDate ?? null,
          isLastDay
        });
      }

      const status = fallbackSubscription.data.status;
      const isActive = (status === "active" || status === "trial") && !isExpired;

      return ok({
        isActive,
        endDate: endDate ?? null,
        isLastDay
      });
    }

    const rows = subscriptionQuery.data;
    if (!rows || rows.length === 0) {
      return ok({
        isActive: false,
        endDate: null,
        isLastDay: false
      });
    }

    const data = rows[0];
    if (!data) {
      return ok({
        isActive: false,
        endDate: null,
        isLastDay: false
      });
    }

    const isActive = data.is_active;

    if (!isActive) {
      eventBus.emit("SUBSCRIPTION.BLOCKED", { tenantSlug });
    }

    return ok({
      isActive,
      endDate: data.end_date ?? null,
      isLastDay: data.is_last_day ?? false
    });
  };

  const bootstrapTenant: TenantService["bootstrapTenant"] = async (userId) => {
    const roleResult = await resolveUserRole(userId);
    if (!roleResult.ok) {
      return err(roleResult.error);
    }

    const normalizedRole = roleResult.data.role?.trim().toLowerCase();

    if (normalizedRole === "admin") {
      return ok({
        tenant: null,
        userRole: roleResult.data,
        subscriptionActive: true,
        subscriptionEndDate: null,
        isLastDay: false
      });
    }

    // Try finding tenant as owner first
    let tenantSlug: string | null = null;
    let tenantId: string | null = null;

    const ownerQuery = await supabase
      .from("tenants")
      .select("id, slug")
      .eq("owner_user_id", userId)
      .maybeSingle<{ id: string; slug: string }>();

    if (ownerQuery.data) {
      tenantSlug = ownerQuery.data.slug;
      tenantId = ownerQuery.data.id;
    } else {
      // Try as employee — find tenant_id from user_roles
      const roleQuery = await supabase
        .from("user_roles")
        .select("tenant_id")
        .eq("user_id", userId)
        .maybeSingle<{ tenant_id: string }>();

      if (roleQuery.data?.tenant_id) {
        const tenantByIdQuery = await supabase
          .from("tenants")
          .select("id, slug")
          .eq("id", roleQuery.data.tenant_id)
          .maybeSingle<{ id: string; slug: string }>();

        if (tenantByIdQuery.data) {
          tenantSlug = tenantByIdQuery.data.slug;
          tenantId = tenantByIdQuery.data.id;
        }
      }
    }

    if (!tenantSlug || !tenantId) {
      return err(
        createAppError({
          code: "TENANT_RESOLVE_FAILED",
          message: "No se pudo resolver tenant para la sesion actual.",
          retryable: false
        })
      );
    }

    const tenant = {
      tenantUuid: tenantId,
      tenantSlug: tenantSlug,
      userId
    };
    eventBus.emit("TENANT.RESOLVED", tenant);

    const subscriptionResult = await checkSubscription(tenantSlug);
    if (!subscriptionResult.ok) {
      return err(subscriptionResult.error);
    }

    return ok({
      tenant,
      userRole: roleResult.data,
      subscriptionActive: subscriptionResult.data.isActive,
      subscriptionEndDate: subscriptionResult.data.endDate || null,
      isLastDay: !!subscriptionResult.data.isLastDay
    });
  };

  return {
    resolveTenantContext,
    resolveUserRole,
    checkSubscription,
    bootstrapTenant
  };
};
