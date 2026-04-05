/**
 * Servicio de administración del sistema.
 * Maneja todas las operaciones CRUD y de gestión para el admin.
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
  DashboardStats,
  UpdateBusinessTypeInput,
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
  CreateUserInput,
  UpdateUserInput,
  GlobalConfig,
  UpdateGlobalConfigInput,
  EmployeeManagement,
  AuditLogEntry
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
  deactivateTenant(id: string): Promise<Result<Tenant, AppError>>;
  deleteTenant(id: string, permanent?: boolean): Promise<Result<void, AppError>>;
  listBusinessTypes(): Promise<Result<BusinessType[], AppError>>;
  createBusinessType(input: CreateBusinessTypeInput): Promise<Result<BusinessType, AppError>>;
  updateBusinessType(id: string, input: UpdateBusinessTypeInput): Promise<Result<BusinessType, AppError>>;
  deleteBusinessType(id: string): Promise<Result<void, AppError>>;
  listPlans(): Promise<Result<Plan[], AppError>>;
  listSubscriptions(): Promise<Result<Subscription[], AppError>>;
  createSubscription(input: CreateSubscriptionInput): Promise<Result<Subscription, AppError>>;
  updateSubscription(id: string, input: UpdateSubscriptionInput): Promise<Result<Subscription, AppError>>;
  listSecurityUsers(tenantId?: string): Promise<Result<SecurityUser[], AppError>>;
  createUser(input: CreateUserInput): Promise<Result<SecurityUser, AppError>>;
  updateUser(userId: string, input: UpdateUserInput): Promise<Result<SecurityUser, AppError>>;
  toggleUserStatus(userId: string, isActive: boolean): Promise<Result<void, AppError>>;
  renewSubscription(subscriptionId: string): Promise<Result<void, AppError>>;
  renewSubscriptionWithPlan(subscriptionId: string, newPlanId?: string): Promise<Result<{ newPlanName: string; newEndDate: string; status: string }, AppError>>;
  getGlobalConfig(): Promise<Result<GlobalConfig, AppError>>;
  updateGlobalConfig(input: UpdateGlobalConfigInput): Promise<Result<GlobalConfig, AppError>>;
  getAuditLogs(limit?: number, offset?: number): Promise<Result<{ logs: AuditLogEntry[]; total: number }, AppError>>;
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
    const [tenantsResult, usersResult, subsResult] = await Promise.all([
      supabase.from("tenants").select("id, is_active"),
      supabase.from("user_roles").select("id, is_active").neq("role", "admin"),
      supabase.from("subscriptions").select("status")
    ]);

    if (tenantsResult.error || usersResult.error || subsResult.error) {
      return err(createAppError({
        code: "ADMIN_DASHBOARD_STATS_FAILED",
        message: tenantsResult.error?.message || usersResult.error?.message || subsResult.error?.message || "Error al cargar estadísticas",
        retryable: true
      }));
    }

    const tenants = tenantsResult.data || [];
    const activeTenants = tenants.filter(t => t.is_active !== false).length;

    const users = usersResult.data || [];
    const activeUsers = users.filter(u => u.is_active !== false).length;

    const subs = subsResult.data || [];
    const activeSubs = subs.filter(s => s.status === "active").length;

    return ok({
      totalTenants: tenants.length,
      activeTenants,
      totalUsers: users.length,
      activeUsers,
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
      taxpayerInfo: row.taxpayer_info,
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
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/admin-create-tenant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${anonKey}`
        },
        body: JSON.stringify(input)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        return err(createAppError({
          code: "ADMIN_CREATE_TENANT_FAILED",
          message: result.error ?? "Error al crear tenant",
          retryable: false
        }));
      }

      eventBus.emit("ADMIN.TENANT_CREATED", { tenantId: result.tenant.id, slug: result.tenant.slug });

      return ok({
        id: result.tenant.id,
        name: result.tenant.name,
        slug: result.tenant.slug,
        ownerUserId: "",
        businessTypeId: input.businessTypeId || "",
        isActive: true,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      return err(createAppError({
        code: "ADMIN_CREATE_TENANT_FAILED",
        message: String(error),
        retryable: false
      }));
    }
  };

  const updateTenant: AdminService["updateTenant"] = async (id, input) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    try {
      const { employees, ...tenantData } = input as UpdateTenantInput & { employees?: EmployeeManagement[] };
      
      if (tenantData && Object.keys(tenantData).length > 0) {
        const response = await fetch(`${supabaseUrl}/functions/v1/admin-manage-tenant`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${anonKey}`
          },
          body: JSON.stringify({ action: "update", tenantId: id, data: tenantData })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          return err(createAppError({
            code: "ADMIN_UPDATE_TENANT_FAILED",
            message: result.error ?? "Error al actualizar tenant",
            retryable: false
          }));
        }
      }

      if (employees && employees.length > 0) {
        const empResponse = await fetch(`${supabaseUrl}/functions/v1/admin-manage-tenant`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${anonKey}`
          },
          body: JSON.stringify({ action: "manage_employees", tenantId: id, data: { employees } })
        });

        const empResult = await empResponse.json();

        if (!empResponse.ok || !empResult.success) {
          return err(createAppError({
            code: "ADMIN_UPDATE_TENANT_EMPLOYEES_FAILED",
            message: empResult.error ?? "Error al gestionar empleados",
            retryable: false
          }));
        }
      }

      eventBus.emit("ADMIN.TENANT_UPDATED", { tenantId: id });

      if (supabase) {
        const getResult = await supabase.from("tenants").select("*").eq("id", id).single();
        if (getResult.error) {
          return ok({
            id,
            name: input.name || "",
            slug: "",
            ownerUserId: input.ownerUserId || "",
            businessTypeId: input.businessTypeId || "",
            isActive: input.isActive ?? true,
            contactEmail: input.contactEmail || "",
            phone: input.phone || "",
            address: input.address || "",
            createdAt: new Date().toISOString()
          });
        }

        return ok({
          id: getResult.data.id,
          name: getResult.data.name,
          slug: getResult.data.slug,
          ownerUserId: getResult.data.owner_user_id,
          businessTypeId: getResult.data.business_type_id,
          isActive: getResult.data.is_active ?? true,
          contactEmail: getResult.data.contact_email,
          phone: getResult.data.phone,
          address: getResult.data.address,
          createdAt: getResult.data.created_at
        });
      }

      return ok({
        id,
        name: input.name || "",
        slug: "",
        ownerUserId: input.ownerUserId || "",
        businessTypeId: input.businessTypeId || "",
        isActive: input.isActive ?? true,
        contactEmail: input.contactEmail || "",
        phone: input.phone || "",
        address: input.address || "",
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      return err(createAppError({
        code: "ADMIN_UPDATE_TENANT_FAILED",
        message: String(error),
        retryable: false
      }));
    }
  };

  const deleteTenant: AdminService["deleteTenant"] = async (id, permanent = false) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/admin-manage-tenant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${anonKey}`
        },
        body: JSON.stringify({ action: "delete", tenantId: id, permanent })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        return err(createAppError({
          code: "ADMIN_DELETE_TENANT_FAILED",
          message: result.error ?? "Error al eliminar tenant",
          retryable: false
        }));
      }

      eventBus.emit("ADMIN.TENANT_DELETED", { tenantId: id });
      return ok(undefined);
    } catch (error) {
      return err(createAppError({
        code: "ADMIN_DELETE_TENANT_FAILED",
        message: String(error),
        retryable: false
      }));
    }
  };

  const deactivateTenant: AdminService["deactivateTenant"] = async (id) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/admin-manage-tenant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${anonKey}`
        },
        body: JSON.stringify({ action: "deactivate", tenantId: id })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        return err(createAppError({
          code: "ADMIN_DEACTIVATE_TENANT_FAILED",
          message: result.error ?? "Error al desactivar tenant",
          retryable: false
        }));
      }

      eventBus.emit("ADMIN.TENANT_DEACTIVATED", { tenantId: id });

      return ok({
        id: result.tenant.id,
        name: result.tenant.name,
        slug: result.tenant.slug,
        ownerUserId: "",
        isActive: false,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      return err(createAppError({
        code: "ADMIN_DEACTIVATE_TENANT_FAILED",
        message: String(error),
        retryable: false
      }));
    }
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

  const updateBusinessType: AdminService["updateBusinessType"] = async (id, input) => {
    const result = await supabase.from("business_types").update(input).eq("id", id).select().single();
    if (result.error) {
      return err(createAppError({
        code: "ADMIN_UPDATE_BUSINESS_TYPE_FAILED",
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
    const result = await supabase.from("plans").select("*").eq("is_active", true).order("price");
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
      trialDays: row.trial_days,
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

  const createSubscription: AdminService["createSubscription"] = async (input) => {
    const insertData = {
      tenant_id: input.tenantId,
      plan_id: input.planId,
      status: input.status || "active",
      start_date: input.startDate || new Date().toISOString(),
      end_date: input.endDate,
      billing_cycle: input.billingCycle || "monthly"
    };

    const result = await supabase.from("subscriptions").insert(insertData).select("*, tenants(name), plans(name)").single();
    if (result.error) {
      return err(createAppError({
        code: "ADMIN_CREATE_SUBSCRIPTION_FAILED",
        message: result.error.message,
        retryable: false
      }));
    }

    return ok({
      id: result.data.id,
      tenantId: result.data.tenant_id,
      tenantName: result.data.tenants?.name,
      planId: result.data.plan_id,
      planName: result.data.plans?.name,
      status: result.data.status,
      startDate: result.data.start_date,
      endDate: result.data.end_date,
      features: result.data.features,
      billingCycle: result.data.billing_cycle,
      createdAt: result.data.created_at
    });
  };

  const updateSubscription: AdminService["updateSubscription"] = async (id, input) => {
    const updateData: Record<string, unknown> = {};
    if (input.planId !== undefined) updateData.plan_id = input.planId;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.startDate !== undefined) updateData.start_date = input.startDate;
    if (input.endDate !== undefined) updateData.end_date = input.endDate;
    if (input.billingCycle !== undefined) updateData.billing_cycle = input.billingCycle;

    const result = await supabase.from("subscriptions").update(updateData).eq("id", id).select("*, tenants(name), plans(name)").single();
    if (result.error) {
      return err(createAppError({
        code: "ADMIN_UPDATE_SUBSCRIPTION_FAILED",
        message: result.error.message,
        retryable: false
      }));
    }

    return ok({
      id: result.data.id,
      tenantId: result.data.tenant_id,
      tenantName: result.data.tenants?.name,
      planId: result.data.plan_id,
      planName: result.data.plans?.name,
      status: result.data.status,
      startDate: result.data.start_date,
      endDate: result.data.end_date,
      features: result.data.features,
      billingCycle: result.data.billing_cycle,
      createdAt: result.data.created_at
    });
  };

  const renewSubscription: AdminService["renewSubscription"] = async (id) => {
    const result = await supabase.rpc("renew_subscription", { p_subscription_id: id });
    if (result.error) {
      return err(createAppError({
        code: "ADMIN_RENEW_SUBSCRIPTION_FAILED",
        message: result.error.message,
        retryable: false
      }));
    }
    eventBus.emit("ADMIN.SUBSCRIPTION_RENEWED", { subscriptionId: id });
    return ok(undefined);
  };

  const renewSubscriptionWithPlan: AdminService["renewSubscriptionWithPlan"] = async (subscriptionId, newPlanId) => {
    const result = await supabase.rpc("renew_subscription_with_plan", { 
      p_subscription_id: subscriptionId,
      p_new_plan_id: newPlanId || null
    });
    if (result.error) {
      return err(createAppError({
        code: "ADMIN_RENEW_SUBSCRIPTION_WITH_PLAN_FAILED",
        message: result.error.message,
        retryable: false
      }));
    }
    // Supabase RPC returns array for RETURNS TABLE. Data might be an array or null.
    interface RenewResult {
      new_plan_name: string;
      new_end_date: string;
      new_status: string;
    }
    const rows = result.data as RenewResult[] | null;
    if (!rows || rows.length === 0) {
      return err(createAppError({
        code: "ADMIN_RENEW_SUBSCRIPTION_WITH_PLAN_FAILED",
        message: "No se recibió respuesta de la renovación",
        retryable: false
      }));
    }
    const data = rows[0] as { new_plan_name: string; new_end_date: string; new_status: string };
    eventBus.emit("ADMIN.SUBSCRIPTION_RENEWED", { subscriptionId, newPlanId });
    return ok({
      newPlanName: data.new_plan_name,
      newEndDate: data.new_end_date,
      status: data.new_status
    });
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

  const createUser: AdminService["createUser"] = async (input) => {
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: input.email,
      password: input.password || Math.random().toString(36).slice(-8),
      email_confirm: true,
      user_metadata: { full_name: input.fullName }
    });

    if (authError || !authData.user) {
      return err(createAppError({
        code: "ADMIN_CREATE_USER_AUTH_FAILED",
        message: authError?.message ?? "Error en el servidor de autenticación",
        retryable: false
      }));
    }

    const result = await supabase.from("user_roles").insert({
      user_id: authData.user.id,
      tenant_id: input.tenantId,
      role: input.role,
      email: input.email,
      full_name: input.fullName,
      is_active: true
    }).select("*, tenants(name)").single();

    if (result.error) {
      return err(createAppError({
        code: "ADMIN_CREATE_USER_ROLE_FAILED",
        message: result.error.message,
        retryable: false
      }));
    }

    return ok({
      id: result.data.id,
      userId: result.data.user_id,
      email: result.data.email,
      fullName: result.data.full_name,
      tenantId: result.data.tenant_id,
      tenantName: result.data.tenants?.name,
      role: result.data.role,
      isActive: result.data.is_active ?? true
    });
  };

  const updateUser: AdminService["updateUser"] = async (userId, input) => {
    const updateData: Record<string, unknown> = {};
    if (input.fullName !== undefined) updateData.full_name = input.fullName;
    if (input.role !== undefined) updateData.role = input.role;
    if (input.isActive !== undefined) updateData.is_active = input.isActive;

    const result = await supabase.from("user_roles").update(updateData).eq("user_id", userId).select("*, tenants(name)").single();
    if (result.error) {
      return err(createAppError({
        code: "ADMIN_UPDATE_USER_FAILED",
        message: result.error.message,
        retryable: false
      }));
    }

    return ok({
      id: result.data.id,
      userId: result.data.user_id,
      email: result.data.email,
      fullName: result.data.full_name,
      tenantId: result.data.tenant_id,
      tenantName: result.data.tenants?.name,
      role: result.data.role,
      isActive: result.data.is_active ?? true,
      lastLoginAt: result.data.last_login_at
    });
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

  const getGlobalConfig: AdminService["getGlobalConfig"] = async () => {
    const result = await supabase.from("global_config").select("*").order("updated_at", { ascending: false }).limit(1).single();
    if (result.error) {
      return err(createAppError({
        code: "ADMIN_GET_CONFIG_FAILED",
        message: result.error.message,
        retryable: true
      }));
    }

    return ok({
      id: result.data.id,
      globalTaxRules: result.data.global_tax_rules || [],
      updatedAt: result.data.updated_at
    });
  };

  const updateGlobalConfig: AdminService["updateGlobalConfig"] = async (input) => {
    const updateData: Record<string, unknown> = {};
    if (input.globalTaxRules !== undefined) updateData.global_tax_rules = input.globalTaxRules;
    updateData.updated_at = new Date().toISOString();

    const configResult = await getGlobalConfig();
    if (!configResult.ok) return err(configResult.error);

    const result = await supabase.from("global_config").update(updateData).eq("id", configResult.data.id).select().single();
    if (result.error) {
      return err(createAppError({
        code: "ADMIN_UPDATE_CONFIG_FAILED",
        message: result.error.message,
        retryable: false
      }));
    }

    return ok({
      id: result.data.id,
      globalTaxRules: result.data.global_tax_rules || [],
      updatedAt: result.data.updated_at
    });
  };

  const getAuditLogs: AdminService["getAuditLogs"] = async (limit = 50, offset = 0) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    try {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/admin-audit-logs?limit=${limit}&offset=${offset}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${anonKey}`
          }
        }
      );

      const result = await response.json();

      if (!response.ok || !result.logs) {
        return err(createAppError({
          code: "ADMIN_GET_AUDIT_LOGS_FAILED",
          message: result.error ?? "Error al obtener logs de auditoría",
          retryable: true
        }));
      }

      const logs: AuditLogEntry[] = result.logs.map((log: Record<string, unknown>) => ({
        id: log.id as string,
        timestamp: log.timestamp as string,
        action: log.action as string,
        userId: log.userId as string | null,
        email: log.email as string | null,
        ipAddress: log.ipAddress as string | null,
        metadata: log.metadata as Record<string, unknown> | null
      }));

      return ok({
        logs,
        total: result.total as number
      });
    } catch (error) {
      return err(createAppError({
        code: "ADMIN_GET_AUDIT_LOGS_FAILED",
        message: String(error),
        retryable: true
      }));
    }
  };

  return {
    getDashboardStats,
    listTenants,
    getTenant,
    createTenant,
    updateTenant,
    deactivateTenant,
    deleteTenant,
    listBusinessTypes,
    createBusinessType,
    updateBusinessType,
    deleteBusinessType,
    listPlans,
    listSubscriptions,
    createSubscription,
    updateSubscription,
    renewSubscription,
    renewSubscriptionWithPlan,
    listSecurityUsers,
    createUser,
    updateUser,
    toggleUserStatus,
    getGlobalConfig,
    updateGlobalConfig,
    getAuditLogs
  };
};
