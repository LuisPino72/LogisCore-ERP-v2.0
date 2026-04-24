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
  ownerPassword: string;
  ownerFullName: string;
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
  };
  employees?: EmployeeInput[];
  hasWarehouse?: boolean;
  warehouse?: WarehouseInput;
}

/**
 * Datos de un empleado a crear con el tenant.
 */
export interface EmployeeInput {
  email?: string;
  password?: string;
  fullName?: string;
  permissions?: string[];
}

/**
 * Datos del warehouse inicial del tenant.
 */
export interface WarehouseInput {
  name?: string;
  address?: string;
  isDefault?: boolean;
}

/**
 * Datos para actualizar un tenant existente.
 */
export interface UpdateTenantInput {
  name?: string | undefined;
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
  };
  ownerUserId?: string;
}

/**
 * Datos para gestionar empleados desde el formulario de tenant.
 */
export interface EmployeeManagement {
  email: string;
  fullName: string;
  password?: string;
  action: "create" | "update" | "delete";
  userId: string;
  isActive: boolean;
  permissions?: string[];
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
  permissions?: string[];
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
  globalTaxRules: Array<{
    name: string;
    rate: number;
    type: "iva" | "islr" | "igtf";
  }>;
  updatedAt: string;
}

/**
 * Datos para actualizar la configuración global.
 */
export interface UpdateGlobalConfigInput {
  globalTaxRules?: Array<{
    name: string;
    rate: number;
    type: "iva" | "islr" | "igtf";
  }>;
}

/**
 * Métricas críticas del sistema en tiempo real.
 * Usado por el Admin Dashboard para monitorear la salud del sistema.
 */
export interface SystemMetrics {
  activeSessionsToday: number;
  transactionsToday: number;
  errorsThisWeek: number;
  lastDeployment: string;
  uptime: number;
  totalTenants: number;
  totalUsers: number;
  activeSubscriptions: number;
}

/**
 * Entrada de log de auditoría.
 */
export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  userId: string | null;
  email: string | null;
  metadata: Record<string, unknown> | null;
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
  | "settings"
  | "globalCatalog"
  | "metrics";

/**
 * Categoría global asignada a un tipo de negocio.
 */
export interface GlobalCategory {
  id: string;
  localId: string;
  name: string;
  businessTypeId: string;
  businessTypeName?: string | undefined;
  createdAt: string;
  updatedAt: string;
}

/**
 * Datos para crear una categoría global.
 */
export interface CreateGlobalCategoryInput {
  name: string;
  businessTypeId: string;
}

/**
 * Presentación de producto global.
 */
export interface GlobalProductPresentation {
  id?: string | undefined;
  name: string;
  factor: number;
  price: number;
  isDefault: boolean;
  barcode?: string | undefined;
}

/**
 * Talla/color de producto global.
 */
export interface GlobalProductSizeColor {
  size?: string | undefined;
  color?: string | undefined;
  skuSuffix?: string | undefined;
  barcode?: string | undefined;
}

/**
 * Producto global con todas sus características.
 */
export interface GlobalProduct {
  id: string;
  localId: string;
  name: string;
  sku: string;
  description?: string | undefined;
  businessTypeId: string;
  businessTypeName?: string | undefined;
  categoryId?: string | undefined;
  categoryName?: string | undefined;
  isWeighted: boolean;
  unitOfMeasure: string;
  isTaxable: boolean;
  isSerialized: boolean;
  weight?: number | undefined;
  length?: number | undefined;
  width?: number | undefined;
  height?: number | undefined;
  visible: boolean;
  defaultPresentationId?: string | undefined;
  presentations: GlobalProductPresentation[];
  sizeColors: GlobalProductSizeColor[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Atributo de producto global.
 */
export interface GlobalProductAttribute {
  id: string;
  name: string;
  type: string;
  values: string[];
}

/**
 * Datos para crear un producto global.
 */
export interface CreateGlobalProductInput {
  name: string;
  sku: string;
  description?: string | undefined;
  businessTypeId: string;
  categoryId?: string | undefined;
  isWeighted: boolean;
  unitOfMeasure: string;
  isTaxable: boolean;
  isSerialized?: boolean | undefined;
  weight?: number | undefined;
  length?: number | undefined;
  width?: number | undefined;
  height?: number | undefined;
  visible?: boolean | undefined;
  attributes: GlobalProductAttribute[];
  presentations: GlobalProductPresentation[];
}
