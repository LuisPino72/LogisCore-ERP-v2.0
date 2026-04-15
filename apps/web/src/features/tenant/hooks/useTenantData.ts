/**
 * Hook personalizado para gestionar los datos del tenant.
 * Provee estado y métodos para el bootstrap y carga de datos del tenant.
 * Utiliza el patrón Result<T, AppError> para manejo de errores.
 */

import { useCallback, useState, useEffect } from "react";
import type { AppError, Result } from "@logiscore/core";
import type { TenantUiState } from "../types/tenant.types";
import type { TenantService } from "../services/tenant.service";
import { eventBus } from "@/lib/core/runtime";

const initialState: TenantUiState = {
  isLoading: false,
  isBlocked: false,
  isLastDay: false,
  subscriptionEndDate: null,
  tenant: null,
  userRole: null,
  lastError: null
};

interface UseTenantDataOptions {
  auth: {
    getActiveSession: () => Promise<Result<{ userId: string }, AppError>>;
  };
  tenant: TenantService;
}

export const useTenantData = ({
  auth,
  tenant
}: UseTenantDataOptions) => {
  const [state, setState] = useState<TenantUiState>(initialState);

  const bootstrapTenantData = useCallback(async () => {
    setState((previous) => ({ ...previous, isLoading: true, lastError: null }));

    const sessionResult = await auth.getActiveSession();
    if (!sessionResult.ok) {
      setState((previous) => ({
        ...previous,
        isLoading: false,
        lastError: sessionResult.error
      }));
      return;
    }

    const tenantResult = await tenant.bootstrapTenant(sessionResult.data.userId);
    if (!tenantResult.ok) {
      setState((previous) => ({
        ...previous,
        isLoading: false,
        lastError: tenantResult.error
      }));
      return;
    }

    setState({
      isLoading: false,
      isBlocked: !tenantResult.data.subscriptionActive,
      isLastDay: !!tenantResult.data.isLastDay,
      subscriptionEndDate: tenantResult.data.subscriptionEndDate || null,
      tenant: tenantResult.data.tenant,
      userRole: tenantResult.data.userRole,
      lastError: null
    });
  }, [auth, tenant]);

  return { state, bootstrapTenantData };
};

/**
 * Hook que refresca el estado del tenant cuando el admin actualiza el plan.
 * Escucha el evento ADMIN.TENANT_UPDATED y vuelve a ejecutar bootstrap.
 */
export const useTenantDataSync = (
  auth: { getActiveSession: () => Promise<Result<{ userId: string }, AppError>> },
  tenant: TenantService,
  bootstrapTenantData: () => Promise<void>
) => {
  useEffect(() => {
    const offTenantUpdated = eventBus.on("ADMIN.TENANT_UPDATED", () => {
      void bootstrapTenantData();
    });

    return () => {
      offTenantUpdated();
    };
  }, [bootstrapTenantData]);
};
