import type { AppError } from "@logiscore/core";

export interface TenantContext {
  tenantUuid: string;
  tenantSlug: string;
  userId: string;
}

export interface RolePermissions {
  canApplyDiscount: boolean;
  maxDiscountPercent: number;
  canApplyCustomPrice: boolean;
  canVoidSale: boolean;
  canRefundSale: boolean;
  canVoidInvoice: boolean;
  canAdjustStock: boolean;
}

export interface UserRole {
  role: "owner" | "employee" | "super_admin";
  permissions: RolePermissions;
}

export interface TenantBootstrapResult {
  tenant: TenantContext | null;
  userRole: UserRole;
  subscriptionActive: boolean;
}

export interface TenantUiState {
  isLoading: boolean;
  isBlocked: boolean;
  tenant: TenantContext | null;
  userRole: UserRole | null;
  lastError: AppError | null;
}
