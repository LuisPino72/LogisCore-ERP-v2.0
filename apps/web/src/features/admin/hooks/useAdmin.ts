/**
 * Hook de coordinación para el módulo de administración.
 * Gestiona el estado de UI y las llamadas al servicio de admin.
 * 
 * Maneja:
 * - Estado de carga y errores
 * - Datos de dashboard, tenants, usuarios, planes
 * - Operaciones CRUD (crear, actualizar, eliminar)
 */

import { useCallback, useState } from "react";
import type { AdminService } from "../services/admin.service";
import type { AdminUiState, AdminModule, DashboardStats, Tenant, BusinessType, Plan, Subscription, SecurityUser, GlobalConfig } from "../types/admin.types";

interface UseAdminOptions {
  service: AdminService;
}

const initialState: AdminUiState = {
  isLoading: false,
  lastError: null
};

/**
 * Hook principal para el panel de administración.
 * @param service - Instancia del servicio de admin inyectada
 * @returns Estado y funciones para gestionar el admin panel
 */
export const useAdmin = ({ service }: UseAdminOptions) => {
  const [state, setState] = useState<AdminUiState>(initialState);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [securityUsers, setSecurityUsers] = useState<SecurityUser[]>([]);
  const [globalConfig, setGlobalConfig] = useState<GlobalConfig | null>(null);
  const [activeModule, setActiveModule] = useState<AdminModule>("dashboard");

  const loadStats = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, lastError: null }));
    const result = await service.getDashboardStats();
    if (!result.ok) {
      setState(prev => ({ ...prev, isLoading: false, lastError: result.error }));
      return;
    }
    setStats(result.data);
    setState(prev => ({ ...prev, isLoading: false }));
  }, [service]);

  const loadTenants = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, lastError: null }));
    const result = await service.listTenants();
    if (!result.ok) {
      setState(prev => ({ ...prev, isLoading: false, lastError: result.error }));
      return;
    }
    setTenants(result.data);
    setState(prev => ({ ...prev, isLoading: false }));
  }, [service]);

  const loadBusinessTypes = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, lastError: null }));
    const result = await service.listBusinessTypes();
    if (!result.ok) {
      setState(prev => ({ ...prev, isLoading: false, lastError: result.error }));
      return;
    }
    setBusinessTypes(result.data);
    setState(prev => ({ ...prev, isLoading: false }));
  }, [service]);

  const loadPlans = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, lastError: null }));
    const result = await service.listPlans();
    if (!result.ok) {
      setState(prev => ({ ...prev, isLoading: false, lastError: result.error }));
      return;
    }
    setPlans(result.data);
    setState(prev => ({ ...prev, isLoading: false }));
  }, [service]);

  const loadSubscriptions = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, lastError: null }));
    const result = await service.listSubscriptions();
    if (!result.ok) {
      setState(prev => ({ ...prev, isLoading: false, lastError: result.error }));
      return;
    }
    setSubscriptions(result.data);
    setState(prev => ({ ...prev, isLoading: false }));
  }, [service]);

  const loadSecurityUsers = useCallback(async (tenantId?: string) => {
    setState(prev => ({ ...prev, isLoading: true, lastError: null }));
    const result = await service.listSecurityUsers(tenantId);
    if (!result.ok) {
      setState(prev => ({ ...prev, isLoading: false, lastError: result.error }));
      return;
    }
    setSecurityUsers(result.data);
    setState(prev => ({ ...prev, isLoading: false }));
  }, [service]);

  const loadGlobalConfig = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, lastError: null }));
    const result = await service.getGlobalConfig();
    if (!result.ok) {
      setState(prev => ({ ...prev, isLoading: false, lastError: result.error }));
      return;
    }
    setGlobalConfig(result.data);
    setState(prev => ({ ...prev, isLoading: false }));
  }, [service]);

  const createTenant = useCallback(async (input: Parameters<typeof service.createTenant>[0]) => {
    setState(prev => ({ ...prev, isLoading: true, lastError: null }));
    const result = await service.createTenant(input);
    if (!result.ok) {
      setState(prev => ({ ...prev, isLoading: false, lastError: result.error }));
      return result;
    }
    setTenants(prev => [...prev, result.data]);
    setState(prev => ({ ...prev, isLoading: false }));
    return result;
  }, [service]);

  const updateTenant = useCallback(async (id: string, input: Parameters<typeof service.updateTenant>[1]) => {
    setState(prev => ({ ...prev, isLoading: true, lastError: null }));
    const result = await service.updateTenant(id, input);
    if (!result.ok) {
      setState(prev => ({ ...prev, isLoading: false, lastError: result.error }));
      return result;
    }
    setTenants(prev => prev.map(t => t.id === id ? result.data : t));
    setState(prev => ({ ...prev, isLoading: false }));
    return result;
  }, [service]);

  const deleteTenant = useCallback(async (id: string) => {
    setState(prev => ({ ...prev, isLoading: true, lastError: null }));
    const result = await service.deleteTenant(id);
    if (!result.ok) {
      setState(prev => ({ ...prev, isLoading: false, lastError: result.error }));
      return result;
    }
    setTenants(prev => prev.filter(t => t.id !== id));
    setState(prev => ({ ...prev, isLoading: false }));
    return result;
  }, [service]);

  const createBusinessType = useCallback(async (input: Parameters<typeof service.createBusinessType>[0]) => {
    setState(prev => ({ ...prev, isLoading: true, lastError: null }));
    const result = await service.createBusinessType(input);
    if (!result.ok) {
      setState(prev => ({ ...prev, isLoading: false, lastError: result.error }));
      return result;
    }
    setBusinessTypes(prev => [...prev, result.data]);
    setState(prev => ({ ...prev, isLoading: false }));
    return result;
  }, [service]);

  const updateBusinessType = useCallback(async (id: string, input: Parameters<typeof service.updateBusinessType>[1]) => {
    setState(prev => ({ ...prev, isLoading: true, lastError: null }));
    const result = await service.updateBusinessType(id, input);
    if (!result.ok) {
      setState(prev => ({ ...prev, isLoading: false, lastError: result.error }));
      return result;
    }
    setBusinessTypes(prev => prev.map(bt => bt.id === id ? result.data : bt));
    setState(prev => ({ ...prev, isLoading: false }));
    return result;
  }, [service]);

  const deleteBusinessType = useCallback(async (id: string) => {
    setState(prev => ({ ...prev, isLoading: true, lastError: null }));
    const result = await service.deleteBusinessType(id);
    if (!result.ok) {
      setState(prev => ({ ...prev, isLoading: false, lastError: result.error }));
      return result;
    }
    setBusinessTypes(prev => prev.filter(bt => bt.id !== id));
    setState(prev => ({ ...prev, isLoading: false }));
    return result;
  }, [service]);

  const createUser = useCallback(async (input: Parameters<typeof service.createUser>[0]) => {
    setState(prev => ({ ...prev, isLoading: true, lastError: null }));
    const result = await service.createUser(input);
    if (!result.ok) {
      setState(prev => ({ ...prev, isLoading: false, lastError: result.error }));
      return result;
    }
    setSecurityUsers(prev => [...prev, result.data]);
    setState(prev => ({ ...prev, isLoading: false }));
    return result;
  }, [service]);

  const updateUser = useCallback(async (userId: string, input: Parameters<typeof service.updateUser>[1]) => {
    setState(prev => ({ ...prev, isLoading: true, lastError: null }));
    const result = await service.updateUser(userId, input);
    if (!result.ok) {
      setState(prev => ({ ...prev, isLoading: false, lastError: result.error }));
      return result;
    }
    setSecurityUsers(prev => prev.map(u => u.userId === userId ? result.data : u));
    setState(prev => ({ ...prev, isLoading: false }));
    return result;
  }, [service]);

  const toggleUserStatus = useCallback(async (userId: string, isActive: boolean) => {
    setState(prev => ({ ...prev, isLoading: true, lastError: null }));
    const result = await service.toggleUserStatus(userId, isActive);
    if (!result.ok) {
      setState(prev => ({ ...prev, isLoading: false, lastError: result.error }));
      return result;
    }
    setSecurityUsers(prev => prev.map(u => u.userId === userId ? { ...u, isActive } : u));
    setState(prev => ({ ...prev, isLoading: false }));
    return result;
  }, [service]);

  const createSubscription = useCallback(async (input: Parameters<typeof service.createSubscription>[0]) => {
    setState(prev => ({ ...prev, isLoading: true, lastError: null }));
    const result = await service.createSubscription(input);
    if (!result.ok) {
      setState(prev => ({ ...prev, isLoading: false, lastError: result.error }));
      return result;
    }
    setSubscriptions(prev => [...prev, result.data]);
    setState(prev => ({ ...prev, isLoading: false }));
    return result;
  }, [service]);

  const updateSubscription = useCallback(async (id: string, input: Parameters<typeof service.updateSubscription>[1]) => {
    setState(prev => ({ ...prev, isLoading: true, lastError: null }));
    const result = await service.updateSubscription(id, input);
    if (!result.ok) {
      setState(prev => ({ ...prev, isLoading: false, lastError: result.error }));
      return result;
    }
    setSubscriptions(prev => prev.map(s => s.id === id ? result.data : s));
    setState(prev => ({ ...prev, isLoading: false }));
    return result;
  }, [service]);

  const renewSubscription = useCallback(async (id: string) => {
    setState(prev => ({ ...prev, isLoading: true, lastError: null }));
    const result = await service.renewSubscription(id);
    if (!result.ok) {
      setState(prev => ({ ...prev, isLoading: false, lastError: result.error }));
      return result;
    }
    // Recargar suscripciones para ver las nuevas fechas
    await loadSubscriptions();
    setState(prev => ({ ...prev, isLoading: false }));
    return result;
  }, [service, loadSubscriptions]);

  const updateGlobalConfig = useCallback(async (input: Parameters<typeof service.updateGlobalConfig>[0]) => {
    setState(prev => ({ ...prev, isLoading: true, lastError: null }));
    const result = await service.updateGlobalConfig(input);
    if (!result.ok) {
      setState(prev => ({ ...prev, isLoading: false, lastError: result.error }));
      return result;
    }
    setGlobalConfig(result.data);
    setState(prev => ({ ...prev, isLoading: false }));
    return result;
  }, [service]);

  return {
    state,
    stats,
    tenants,
    businessTypes,
    plans,
    subscriptions,
    securityUsers,
    globalConfig,
    activeModule,
    setActiveModule,
    loadStats,
    loadTenants,
    loadBusinessTypes,
    loadPlans,
    loadSubscriptions,
    loadSecurityUsers,
    loadGlobalConfig,
    createTenant,
    updateTenant,
    deleteTenant,
    createBusinessType,
    updateBusinessType,
    deleteBusinessType,
    createUser,
    updateUser,
    toggleUserStatus,
    createSubscription,
    updateSubscription,
    renewSubscription,
    updateGlobalConfig
  };
};
