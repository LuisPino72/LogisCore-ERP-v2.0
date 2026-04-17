import { create } from "zustand";
import type { UserRole, TenantContext } from "@/features/tenant/types/tenant.types";

interface PermissionState {
  userRole: UserRole | null;
  tenantContext: TenantContext | null;
  setUserRole: (role: UserRole | null) => void;
  setTenantContext: (tenant: TenantContext | null) => void;
}

export const usePermissionStore = create<PermissionState>((set) => ({
  userRole: null,
  tenantContext: null,
  setUserRole: (role) => set({ userRole: role }),
  setTenantContext: (tenant) => set({ tenantContext: tenant }),
}));
