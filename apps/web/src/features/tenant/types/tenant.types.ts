import type { AppError } from "@logiscore/core";

/**
 * Contexto del tenant.
 * Identifica la empresa/organización y datos de contacto.
 */
export interface TenantContext {
  tenantUuid: string;
  tenantSlug: string;
  userId: string;
  contactEmail?: string;
  phone?: string;
  address?: string;
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
  canApplyDiscount: boolean;
  maxDiscountPercent: number;
  canApplyCustomPrice: boolean;
  canVoidSale: boolean;
  canRefundSale: boolean;
  canVoidInvoice: boolean;
  canAdjustStock: boolean;
  canViewReports: boolean;
  canExportReports: boolean;
  allowedWarehouseLocalIds?: string[];
  canCreatePurchaseOrders?: boolean;
  canApprovePurchaseOrders?: boolean;
  canCreateProductionOrders?: boolean;
  canApproveProductionOrders?: boolean;
  canManageUsers?: boolean;
  canManageTenants?: boolean;
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
  role: "owner" | "employee" | "super_admin";
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
}

/**
 * Estado de la UI para el módulo de tenant.
 */
export interface TenantUiState {
  isLoading: boolean;
  isBlocked: boolean;
  tenant: TenantContext | null;
  userRole: UserRole | null;
  lastError: AppError | null;
}
