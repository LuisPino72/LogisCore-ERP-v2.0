import type { AppError } from "@logiscore/core";

/**
 * Contexto del tenant.
 * Identifica la empresa/organización y datos de contacto.
 */
export interface TenantContext {
  tenantUuid: string;
  tenantSlug: string;
  userId: string;
  name?: string;
  logoUrl?: string;
  contactEmail?: string;
  phone?: string;
  address?: string;
  businessTypeId?: string;
  isActive?: boolean;
  taxpayerInfo?: Record<string, unknown>;
  timezone?: string;
  currency?: string;
  maxUsers?: number;
  features?: Record<string, boolean>;
}

/**
 * Permisos asociados a un rol.
 * Define las operaciones permitidas para el usuario.
 */
/**
 * Permisos asociados a un rol.
 * Define las operaciones permitidas para el usuario.
 */
export interface RolePermissions {
  permissions: string[];
  maxDiscountPercent: number;
  allowedWarehouseLocalIds: string[];
}

export function hasPermission(permissions: RolePermissions, permission: string, role: string): boolean {
  if (role === "owner" || role === "admin") {
    return true;
  }
  if (!permissions) {
    return false;
  }
  if (Array.isArray(permissions.permissions)) {
    return permissions.permissions.includes(permission);
  }
  return false;
}

/**
 * Rol de usuario en un tenant.
 * Combina el tipo de rol con los permisos y datos del usuario.
 */
/**
 * Rol de usuario en un tenant.
 * Combina el tipo de rol con los permisos y datos del usuario.
 */
export interface UserRole {
  role: "owner" | "employee" | "admin" | "admin";
  permissions: RolePermissions;
  email: string;
  fullName: string;
  lastLoginAt?: string | null;
  isActive: boolean;
}

/**
 * Resultado del bootstrap del tenant.
 * Contiene el tenant, rol del usuario y estado de suscripción.
 */
/**
 * Resultado del bootstrap del tenant.
 * Contiene el tenant, rol del usuario y estado de suscripción.
 */
export interface TenantBootstrapResult {
  tenant: TenantContext | null;
  userRole: UserRole;
  subscriptionActive: boolean;
  subscriptionEndDate: string | null;
  isLastDay: boolean;
  maxUsers?: number;
  features?: Record<string, boolean>;
}

/**
 * Estado de la UI para el módulo de tenant.
 */
export interface TenantUiState {
  isLoading: boolean;
  isBlocked: boolean;
  isLastDay: boolean; // Flag para el banner
  subscriptionEndDate: string | null;
  tenant: TenantContext | null;
  userRole: UserRole | null;
  lastError: AppError | null;
}
