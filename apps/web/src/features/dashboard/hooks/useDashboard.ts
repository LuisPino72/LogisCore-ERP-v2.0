import { useState, useCallback } from "react";
import type { DashboardUiState } from "../types/dashboard.types";
import { dashboardService } from "../services/dashboard.service.instance";
import type { SalesTenantContext } from "@/features/sales/types/sales.types";
import type { InventoryTenantContext, InventoryActorContext } from "@/features/inventory/types/inventory.types";
import type { ProductsTenantContext } from "@/features/products/types/products.types";

export function useDashboard() {
  const [state, setState] = useState<DashboardUiState>({
    isLoading: false,
    data: null,
    lastError: null
  });

  const loadData = useCallback(async (
    tenant: SalesTenantContext & InventoryTenantContext & ProductsTenantContext,
    actor: InventoryActorContext
  ) => {
    setState(s => ({ ...s, isLoading: true, lastError: null }));
    
    const result = await dashboardService.getDashboardData(tenant, actor);
    
    if (result.ok) {
      setState({
        isLoading: false,
        data: result.data,
        lastError: null
      });
    } else {
      setState({
        isLoading: false,
        data: null,
        lastError: result.error
      });
    }
  }, []);

  const invalidateCache = useCallback(() => {
    dashboardService.invalidateCache();
  }, []);

  return {
    state,
    loadData,
    invalidateCache
  };
}
