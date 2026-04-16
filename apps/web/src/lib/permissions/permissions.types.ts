export interface ActorPermissions {
  permissions: string[];
  maxDiscountPercent: number;
  allowedWarehouseLocalIds: string[];
}

export type ActorRole = "owner" | "employee" | "admin";

export interface ActorContext {
  role: ActorRole;
  permissions: ActorPermissions;
}

export function createPermissionsService() {
  const hasPermission = (actor: ActorContext, permission: string): boolean => {
    if (actor.role === "owner" || actor.role === "admin") {
      return true;
    }
    return actor.permissions.permissions.includes(permission);
  };

  return {
    canManageCatalog: (actor: ActorContext) =>
      hasPermission(actor, "PRODUCTS:CATALOG") ||
      hasPermission(actor, "PRODUCTS:CREATE"),

    canApplyDiscount: (actor: ActorContext) =>
      hasPermission(actor, "SALES:DISCOUNT") ||
      actor.permissions.maxDiscountPercent > 0,

    canVoidTransaction: (actor: ActorContext) =>
      hasPermission(actor, "SALES:VOID"),

    canRefundTransaction: (actor: ActorContext) =>
      hasPermission(actor, "SALES:REFUND"),

    canAdjustStock: (actor: ActorContext) =>
      hasPermission(actor, "INVENTORY:ADJUST"),

    canManageUsers: (actor: ActorContext) =>
      hasPermission(actor, "ADMIN:USERS"),

    canManageSubscriptions: (actor: ActorContext) =>
      hasPermission(actor, "ADMIN:SUBSCRIPTION"),

    canViewReports: (actor: ActorContext) =>
      hasPermission(actor, "REPORTS:VIEW"),

    canExportReports: (actor: ActorContext) =>
      hasPermission(actor, "REPORTS:EXPORT"),

    canVoidInvoice: (actor: ActorContext) =>
      hasPermission(actor, "INVOICE:VOID"),

    canReceivePurchase: (actor: ActorContext) =>
      hasPermission(actor, "PURCHASES:RECEIVE"),

    canCreateProductionOrder: (actor: ActorContext) =>
      hasPermission(actor, "PRODUCTION:ORDER"),
  };
}

export type PermissionsService = ReturnType<typeof createPermissionsService>;