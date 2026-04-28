import { create } from 'zustand';
import type { UserRole, TenantContext } from "@/features/tenant/types/tenant.types";

interface PermissionsState {
  userRole: UserRole | null;
  tenantContext: TenantContext | null;
  setUserRole: (role: UserRole | null) => void;
  setTenantContext: (context: TenantContext | null) => void;
}

export const usePermissionsStore = create<PermissionsState>((set) => ({
  userRole: null,
  tenantContext: null,
  setUserRole: (role) => set({ userRole: role }),
  setTenantContext: (context) => set({ tenantContext: context }),
}));
