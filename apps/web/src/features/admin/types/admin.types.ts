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
  name?: string;
  businessTypeId?: string;
  isActive?: boolean;
  logoUrl?: string;
  contactEmail?: string;
  phone?: string;
  address?: string;
  timezone?: string;
  currency?: string;
  taxpayerInfo?: {
    rif?: string;
    razonSocial?: string;
    direccionFiscal?: string;
    regimen?: string;
  };
  ownerUserId?: string;
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
  createdAt: string;
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
