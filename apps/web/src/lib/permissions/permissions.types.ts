export interface ActorPermissions {
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
}

export type ActorRole = "owner" | "employee" | "super_admin";

export interface ActorContext {
  role: ActorRole;
  permissions: ActorPermissions;
}

export interface PermissionsService {
  canManageCatalog(actor: ActorContext): boolean;
  canApplyDiscount(actor: ActorContext): boolean;
  canVoidTransaction(actor: ActorContext): boolean;
  canRefundTransaction(actor: ActorContext): boolean;
  canAdjustStock(actor: ActorContext): boolean;
  canManageUsers(actor: ActorContext): boolean;
  canManageSubscriptions(actor: ActorContext): boolean;
  canViewReports(actor: ActorContext): boolean;
  canExportReports(actor: ActorContext): boolean;
}

export const createPermissionsService = (): PermissionsService => ({
  canManageCatalog: (actor) => 
    actor.role === "owner" || actor.role === "super_admin" ||
    actor.permissions.canAdjustStock || actor.permissions.canApplyCustomPrice,
    
  canApplyDiscount: (actor) =>
    actor.role === "owner" || actor.role === "super_admin" ||
    (actor.permissions.canApplyDiscount && 
     actor.permissions.maxDiscountPercent > 0),
    
  canVoidTransaction: (actor) =>
    actor.role === "owner" || actor.role === "super_admin" ||
    actor.permissions.canVoidSale,
    
  canRefundTransaction: (actor) =>
    actor.role === "owner" || actor.role === "super_admin" ||
    actor.permissions.canRefundSale,
    
  canAdjustStock: (actor) =>
    actor.role === "owner" || actor.role === "super_admin" ||
    actor.permissions.canAdjustStock,
    
  canManageUsers: (actor) =>
    actor.role === "owner" || actor.role === "super_admin",
    
  canManageSubscriptions: (actor) =>
    actor.role === "owner" || actor.role === "super_admin",
    
  canViewReports: (actor) =>
    actor.role === "owner" || actor.role === "super_admin" ||
    actor.permissions.canViewReports,
    
  canExportReports: (actor) =>
    actor.role === "owner" || actor.role === "super_admin" ||
    actor.permissions.canExportReports
});