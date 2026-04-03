/**
 * Servicio de administración del sistema.
 * Maneja todas las operaciones CRUD y de gestión para el super admin.
 * 
 * Funcionalidades:
 * - Estadísticas del dashboard
 * - Gestión de tenants (empresas)
 * - Gestión de tipos de negocio
 * - Gestión de planes y suscripciones
 * - Gestión de usuarios y seguridad
 * 
 * Usa el patrón Result<T, AppError> para manejo de errores.
 */

import { createAppError, err, ok, type AppError, type EventBus, type Result } from "@logiscore/core";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Tenant,
  CreateTenantInput,
  UpdateTenantInput,
  BusinessType,
  CreateBusinessTypeInput,
  Plan,
  Subscription,
  SecurityUser,
  DashboardStats
} from "../types/admin.types";

/**
 * Contrato del servicio de admin.
 * Define todas las operaciones disponibles para la administración.
 */
export interface AdminService {
  getDashboardStats(): Promise<Result<DashboardStats, AppError>>;
  listTenants(): Promise<Result<Tenant[], AppError>>;
  getTenant(id: string): Promise<Result<Tenant, AppError>>;
  createTenant(input: CreateTenantInput): Promise<Result<Tenant, AppError>>;
  updateTenant(id: string, input: UpdateTenantInput): Promise<Result<Tenant, AppError>>;
  deleteTenant(id: string): Promise<Result<void, AppError>>;
  listBusinessTypes(): Promise<Result<BusinessType[], AppError>>;
  createBusinessType(input: CreateBusinessTypeInput): Promise<Result<BusinessType, AppError>>;
  deleteBusinessType(id: string): Promise<Result<void, AppError>>;
  listPlans(): Promise<Result<Plan[], AppError>>;
  listSubscriptions(): Promise<Result<Subscription[], AppError>>;
  listSecurityUsers(tenantId?: string): Promise<Result<SecurityUser[], AppError>>;
  toggleUserStatus(userId: string, isActive: boolean): Promise<Result<void, AppError>>;
}

/** Dependencias necesarias para crear el servicio */
interface CreateAdminServiceDependencies {
  supabase: SupabaseClient;
  eventBus: EventBus;
}

/**
 * Factory que crea el servicio de admin.
 * Inyecta las dependencias (supabase y eventBus).
 */
export const createAdminService = ({
  supabase,
  eventBus
}: CreateAdminServiceDependencies): AdminService => {
  /**
   * Obtiene estadísticas globales para el dashboard.
   * Cuenta tenants, usuarios y suscripciones activas.
   */
  const getDashboardStats: AdminService["getDashboardStats"] = async () => {
    const tenantsResult = await supabase.from("tenants").select("id, is_active");
    if (tenantsResult.error) {
      return err(createAppError({
        code: "ADMIN_DASHBOARD_STATS_FAILED",
        message: tenantsResult.error.message,
        retryable: true
      }));
    }

    const tenants = tenantsResult.data || [];
    const activeTenants = tenants.filter(t => t.is_active !== false).length;

    const usersResult = await supabase.from("user_roles").select("id, is_active");
    const users = usersResult.data || [];
    const activeUsers = users.filter(u => u.is_active !== false).length;

    const subsResult = await supabase.from("subscriptions").select("status");
    const subs = subsResult.data || [];
    const activeSubs = subs.filter(s => s.status === "active").length;

    return ok({
      totalTenants: tenants.length,
      activeTenants,
      totalUsers: users.length,
      activeSubscriptions: activeSubs,
      tenantsTrend: 0
    });
  };

  const listTenants: AdminService["listTenants"] = async () => {
    const result = await supabase.from("tenants").select("*, business_types(name)");
    if (result.error) {
      return err(createAppError({
        code: "ADMIN_LIST_TENANTS_FAILED",
        message: result.error.message,
        retryable: true
      }));
    }

    const tenants: Tenant[] = (result.data || []).map(row => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      ownerUserId: row.owner_user_id,
      businessTypeId: row.business_type_id,
      businessTypeName: row.business_types?.name,
      isActive: row.is_active ?? true,
      logoUrl: row.logo_url,
      contactEmail: row.contact_email,
      phone: row.phone,
      address: row.address,
      timezone: row.timezone,
      currency: row.currency,
      createdAt: row.created_at
    }));

    return ok(tenants);
  };

  const getTenant: AdminService["getTenant"] = async (id) => {
    const result = await supabase.from("tenants").select("*").eq("id", id).single();
    if (result.error) {
      return err(createAppError({
        code: "ADMIN_GET_TENANT_FAILED",
        message: result.error.message,
        retryable: true
      }));
    }

    return ok({
      id: result.data.id,
      name: result.data.name,
      slug: result.data.slug,
      ownerUserId: result.data.owner_user_id,
      businessTypeId: result.data.business_type_id,
      isActive: result.data.is_active ?? true,
      logoUrl: result.data.logo_url,
      contactEmail: result.data.contact_email,
      phone: result.data.phone,
      address: result.data.address,
      taxpayerInfo: result.data.taxpayer_info,
      timezone: result.data.timezone,
      currency: result.data.currency,
      createdAt: result.data.created_at
    });
  };

  const createTenant: AdminService["createTenant"] = async (input) => {
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: input.ownerEmail,
      email_confirm: true
    });

    if (authError || !authData.user) {
      return err(createAppError({
        code: "ADMIN_CREATE_TENANT_USER_FAILED",
        message: authError?.message ?? "No se pudo crear el usuario",
        retryable: false
      }));
    }

    const insertData = {
      name: input.name,
      slug: input.slug,
      owner_user_id: authData.user.id,
      contact_email: input.contactEmail,
      phone: input.phone,
      address: input.address,
      business_type_id: input.businessTypeId,
      is_active: true
    };

    const result = await supabase.from("tenants").insert(insertData).select().single();
    if (result.error) {
      return err(createAppError({
        code: "ADMIN_CREATE_TENANT_FAILED",
        message: result.error.message,
        retryable: false
      }));
    }

    await supabase.from("user_roles").insert({
      user_id: authData.user.id,
      tenant_id: result.data.id,
      role: "owner",
      email: input.ownerEmail,
      is_active: true
    });

    eventBus.emit("ADMIN.TENANT_CREATED", { tenantId: result.data.id, slug: result.data.slug });

    return ok({
      id: result.data.id,
      name: result.data.name,
      slug: result.data.slug,
      ownerUserId: result.data.owner_user_id,
      businessTypeId: result.data.business_type_id,
      isActive: result.data.is_active ?? true,
      createdAt: result.data.created_at
    });
  };

  const updateTenant: AdminService["updateTenant"] = async (id, input) => {
    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.businessTypeId !== undefined) updateData.business_type_id = input.businessTypeId;
    if (input.isActive !== undefined) updateData.is_active = input.isActive;
    if (input.logoUrl !== undefined) updateData.logo_url = input.logoUrl;
    if (input.contactEmail !== undefined) updateData.contact_email = input.contactEmail;
    if (input.phone !== undefined) updateData.phone = input.phone;
    if (input.address !== undefined) updateData.address = input.address;
    if (input.timezone !== undefined) updateData.timezone = input.timezone;
    if (input.currency !== undefined) updateData.currency = input.currency;

    const result = await supabase.from("tenants").update(updateData).eq("id", id).select().single();
    if (result.error) {
      return err(createAppError({
        code: "ADMIN_UPDATE_TENANT_FAILED",
        message: result.error.message,
        retryable: false
      }));
    }

    eventBus.emit("ADMIN.TENANT_UPDATED", { tenantId: id });

    return ok({
      id: result.data.id,
      name: result.data.name,
      slug: result.data.slug,
      ownerUserId: result.data.owner_user_id,
      businessTypeId: result.data.business_type_id,
      isActive: result.data.is_active ?? true,
      logoUrl: result.data.logo_url,
      contactEmail: result.data.contact_email,
      phone: result.data.phone,
      address: result.data.address,
      createdAt: result.data.created_at
    });
  };

  const deleteTenant: AdminService["deleteTenant"] = async (id) => {
    const result = await supabase.from("tenants").delete().eq("id", id);
    if (result.error) {
      return err(createAppError({
        code: "ADMIN_DELETE_TENANT_FAILED",
        message: result.error.message,
        retryable: false
      }));
    }
    eventBus.emit("ADMIN.TENANT_DELETED", { tenantId: id });
    return ok(undefined);
  };

  const listBusinessTypes: AdminService["listBusinessTypes"] = async () => {
    const result = await supabase.from("business_types").select("*").order("name");
    if (result.error) {
      return err(createAppError({
        code: "ADMIN_LIST_BUSINESS_TYPES_FAILED",
        message: result.error.message,
        retryable: true
      }));
    }

    const businessTypes: BusinessType[] = (result.data || []).map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      createdAt: row.created_at
    }));

    return ok(businessTypes);
  };

  const createBusinessType: AdminService["createBusinessType"] = async (input) => {
    const result = await supabase.from("business_types").insert(input).select().single();
    if (result.error) {
      return err(createAppError({
        code: "ADMIN_CREATE_BUSINESS_TYPE_FAILED",
        message: result.error.message,
        retryable: false
      }));
    }

    return ok({
      id: result.data.id,
      name: result.data.name,
      description: result.data.description,
      createdAt: result.data.created_at
    });
  };

  const deleteBusinessType: AdminService["deleteBusinessType"] = async (id) => {
    const result = await supabase.from("business_types").delete().eq("id", id);
    if (result.error) {
      return err(createAppError({
        code: "ADMIN_DELETE_BUSINESS_TYPE_FAILED",
        message: result.error.message,
        retryable: false
      }));
    }
    return ok(undefined);
  };

  const listPlans: AdminService["listPlans"] = async () => {
    const result = await supabase.from("plans").select("*").order("price");
    if (result.error) {
      return err(createAppError({
        code: "ADMIN_LIST_PLANS_FAILED",
        message: result.error.message,
        retryable: true
      }));
    }

    const plans: Plan[] = (result.data || []).map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      price: row.price,
      features: row.features,
      maxUsers: row.max_users,
      maxProducts: row.max_products,
      isActive: row.is_active ?? true,
      createdAt: row.created_at
    }));

    return ok(plans);
  };

  const listSubscriptions: AdminService["listSubscriptions"] = async () => {
    const result = await supabase.from("subscriptions").select("*, tenants(name), plans(name)");
    if (result.error) {
      return err(createAppError({
        code: "ADMIN_LIST_SUBSCRIPTIONS_FAILED",
        message: result.error.message,
        retryable: true
      }));
    }

    const subscriptions: Subscription[] = (result.data || []).map(row => ({
      id: row.id,
      tenantId: row.tenant_id,
      tenantName: row.tenants?.name,
      planId: row.plan_id,
      planName: row.plans?.name,
      status: row.status,
      startDate: row.start_date,
      endDate: row.end_date,
      features: row.features,
      billingCycle: row.billing_cycle,
      createdAt: row.created_at
    }));

    return ok(subscriptions);
  };

  const listSecurityUsers: AdminService["listSecurityUsers"] = async (tenantId) => {
    const query = tenantId 
      ? supabase.from("user_roles").select("*, tenants(name)").eq("tenant_id", tenantId)
      : supabase.from("user_roles").select("*, tenants(name)");

    const result = await query;
    if (result.error) {
      return err(createAppError({
        code: "ADMIN_LIST_SECURITY_USERS_FAILED",
        message: result.error.message,
        retryable: true
      }));
    }

    const users: SecurityUser[] = (result.data || []).map(row => ({
      id: row.id,
      userId: row.user_id,
      email: row.email,
      fullName: row.full_name,
      tenantId: row.tenant_id,
      tenantName: row.tenants?.name,
      role: row.role,
      isActive: row.is_active ?? true,
      lastLoginAt: row.last_login_at
    }));

    return ok(users);
  };

  const toggleUserStatus: AdminService["toggleUserStatus"] = async (userId, isActive) => {
    const result = await supabase.from("user_roles").update({ is_active: isActive }).eq("user_id", userId);
    if (result.error) {
      return err(createAppError({
        code: "ADMIN_TOGGLE_USER_STATUS_FAILED",
        message: result.error.message,
        retryable: false
      }));
    }
    eventBus.emit("ADMIN.USER_STATUS_TOGGLED", { userId, isActive });
    return ok(undefined);
  };

  return {
    getDashboardStats,
    listTenants,
    getTenant,
    createTenant,
    updateTenant,
    deleteTenant,
    listBusinessTypes,
    createBusinessType,
    deleteBusinessType,
    listPlans,
    listSubscriptions,
    listSecurityUsers,
    toggleUserStatus
  };
};
