/**
 * Tipos para el módulo de administración.
 * Define las interfaces utilizadas por el servicio y componentes del admin.
 */

import type { AppError } from "@logiscore/core";

/**
 * Representa un tenant (empresa/organización) en el sistema.
 * Contiene información básica, configuración y datos de contacto.
 */
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  ownerUserId: string;
  businessTypeId?: string;
  businessTypeName?: string;
  isActive: boolean;
  logoUrl?: string;
  contactEmail?: string;
  phone?: string;
  address?: string;
  taxpayerInfo?: Record<string, unknown>;
  timezone?: string;
  currency?: string;
  createdAt: string;
}

/**
 * Datos necesarios para crear un nuevo tenant.
 */
export interface CreateTenantInput {
  name: string;
  slug: string;
  ownerEmail: string;
  planId: string;
  trialDays?: number;
  businessTypeId?: string;
  contactEmail?: string;
  phone?: string;
  address?: string;
  logoUrl?: string;
  taxpayerInfo?: {
    rif: string;
    razonSocial: string;
    direccionFiscal: string;
    regimen?: string;
  };
}

/**
 * Datos para actualizar un tenant existente.
 */
export interface UpdateTenantInput {
  name?: string | undefined;
  businessTypeId?: string | undefined;
  isActive?: boolean;
  logoUrl?: string | undefined;
  contactEmail?: string | undefined;
  phone?: string | undefined;
  address?: string | undefined;
  timezone?: string | undefined;
  currency?: string | undefined;
  taxpayerInfo?: {
    rif?: string | undefined;
    razonSocial?: string | undefined;
    direccionFiscal?: string | undefined;
    regimen?: string | undefined;
  };
  ownerUserId?: string | undefined;
}

/**
 * Categoría de negocio asignada a los tenants.
 */
export interface BusinessType {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

/**
 * Datos para crear un tipo de negocio.
 */
export interface CreateBusinessTypeInput {
  name: string;
  description?: string;
}

/**
 * Datos para actualizar un tipo de negocio.
 */
export interface UpdateBusinessTypeInput {
  name?: string;
  description?: string | undefined;
}

/**
 * Plan de suscripción disponible en el sistema.
 */
export interface Plan {
  id: string;
  name: string;
  description?: string;
  price: number;
  features: Record<string, unknown>;
  maxUsers: number;
  maxProducts: number;
  isActive: boolean;
  trialDays?: number;
  createdAt: string;
}

/**
 * Suscripción activa de un tenant a un plan.
 */
export interface Subscription {
  id: string;
  tenantId: string;
  tenantName?: string;
  planId?: string;
  planName?: string;
  status: string;
  startDate?: string;
  endDate?: string;
  features?: Record<string, unknown>;
  billingCycle?: string;
  trialDays?: number;
  createdAt: string;
}

/**
 * Datos para crear una nueva suscripción.
 */
export interface CreateSubscriptionInput {
  tenantId: string;
  planId: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  billingCycle?: string;
}

/**
 * Datos para actualizar una suscripción.
 */
export interface UpdateSubscriptionInput {
  planId?: string;
  status?: string | undefined;
  startDate?: string;
  endDate?: string | undefined;
  billingCycle?: string | undefined;
}

/**
 * Usuario con rol en el sistema (admin de tenant).
 */
export interface SecurityUser {
  id: string;
  userId: string;
  email: string;
  fullName?: string;
  tenantId?: string;
  tenantName?: string;
  role: string;
  isActive: boolean;
  lastLoginAt?: string;
}

/**
 * Datos para crear un nuevo usuario.
 */
export interface CreateUserInput {
  email: string;
  fullName?: string | undefined;
  role: "owner" | "employee";
  tenantId: string;
  password?: string | undefined;
}

/**
 * Datos para actualizar un usuario.
 */
export interface UpdateUserInput {
  fullName?: string | undefined;
  role?: "owner" | "employee";
  isActive?: boolean;
}

/**
 * Estadísticas globales del dashboard administrativo.
 */
export interface DashboardStats {
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
  activeSubscriptions: number;
  tenantsTrend: number;
}

/**
 * Configuración global del sistema.
 */
export interface GlobalConfig {
  id: string;
  systemName: string;
  defaultCurrency: string;
  globalTaxRules: Array<{
    name: string;
    rate: number;
    type: "iva" | "islr" | "igtf";
  }>;
  maintenanceMode: boolean;
  supportContact?: string;
  welcomeMessage?: string;
  updatedAt: string;
}

/**
 * Datos para actualizar la configuración global.
 */
export interface UpdateGlobalConfigInput {
  systemName?: string;
  defaultCurrency?: string;
  globalTaxRules?: Array<{
    name: string;
    rate: number;
    type: "iva" | "islr" | "igtf";
  }>;
  maintenanceMode?: boolean;
  supportContact?: string | undefined;
  welcomeMessage?: string | undefined;
}

/**
 * Estado de la UI del módulo admin.
 */
export interface AdminUiState {
  isLoading: boolean;
  lastError: AppError | null;
}

/**
 * Módulos disponibles en el panel administrativo.
 */
export type AdminModule = 
  | "dashboard"
  | "tenants"
  | "security"
  | "businessTypes"
  | "subscriptions"
  | "settings";
