import { useCallback, useMemo } from "react";
import { DEFAULT_EMPLOYEE_PERMISSIONS } from "./rbac-constants";
import type { UserRole, TenantContext } from "@/features/tenant/types/tenant.types";

let globalUserRole: UserRole | null = null;
let globalTenantContext: TenantContext | null = null;

export const setGlobalTenantContext = (tenant: TenantContext | null) => {
  globalTenantContext = tenant;
};

export const setGlobalUserRole = (role: UserRole | null) => {
  globalUserRole = role;
};

export const usePermissions = () => {
  const userRole = globalUserRole;

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!userRole) return false;
      if (userRole.role === "owner" || userRole.role === "admin") {
        return true;
      }
      const perms = userRole.permissions?.permissions ?? [];
      return perms.includes(permission);
    },
    [userRole]
  );

  const hasAnyPermission = useCallback(
    (permissions: string[]): boolean => {
      if (!userRole) return false;
      if (userRole.role === "owner" || userRole.role === "admin") {
        return true;
      }
      const userPerms = userRole.permissions?.permissions ?? [];
      return permissions.some((p) => userPerms.includes(p));
    },
    [userRole]
  );

  const canAccessModule = useCallback(
    (modulePermissions: string[]): boolean => {
      if (!userRole) return false;
      if (userRole.role === "owner" || userRole.role === "admin") {
        return true;
      }
      const userPerms = userRole.permissions?.permissions ?? [];
      return modulePermissions.some((p) => userPerms.includes(p));
    },
    [userRole]
  );

  const modulePermissions = useMemo(() => {
    if (!userRole) return { canPos: false, canInventory: false, canPurchases: false, canInvoicing: false, canProduction: false, canReports: false, canAdmin: false };
    
    const isOwnerOrAdmin = userRole.role === "owner" || userRole.role === "admin";
    const perms = isOwnerOrAdmin 
      ? ["SALES:POS", "INVENTORY:VIEW", "PURCHASES:ORDER", "INVOICE:ISSUE", "PRODUCTION:ORDER", "REPORTS:VIEW", "ADMIN:USERS"]
      : (userRole.permissions?.permissions ?? Array.from(DEFAULT_EMPLOYEE_PERMISSIONS));

    return {
      canPos: perms.some(p => p.startsWith("SALES:")),
      canInventory: perms.some(p => p.startsWith("INVENTORY:")),
      canPurchases: perms.some(p => p.startsWith("PURCHASES:")),
      canInvoicing: perms.some(p => p.startsWith("INVOICE:")),
      canProduction: perms.some(p => p.startsWith("PRODUCTION:")),
      canReports: perms.some(p => p.startsWith("REPORTS:")),
      canAdmin: perms.some(p => p.startsWith("ADMIN:")),
    };
  }, [userRole]);

  return {
    hasPermission,
    hasAnyPermission,
    canAccessModule,
    ...modulePermissions,
    role: userRole?.role ?? null,
    isOwner: userRole?.role === "owner",
    isAdmin: userRole?.role === "admin",
    isEmployee: userRole?.role === "employee",
  };
};

export type UsePermissions = ReturnType<typeof usePermissions>;

export const useModuleAccess = (_moduleName: string): { hasAccess: boolean; isLoading: boolean } => {
  const tenant = globalTenantContext;

  const hasAccess = useMemo(() => {
    if (!tenant?.features) return true;
    if (tenant.features[_moduleName] === undefined) return true;
    return tenant.features[_moduleName] === true;
  }, [tenant?.features, _moduleName]);

  return {
    hasAccess,
    isLoading: false
  };
};