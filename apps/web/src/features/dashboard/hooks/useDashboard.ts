import { useState, useCallback, useEffect, useRef } from "react";
import { eventBus } from "@/lib/core/runtime";
import type { DashboardUiState } from "../types/dashboard.types";
import { dashboardService } from "../services/dashboard.service.instance";
import type { SalesTenantContext } from "@/features/sales/types/sales.types";
import type { InventoryTenantContext, InventoryActorContext } from "@/features/inventory/types/inventory.types";
import type { ProductsTenantContext } from "@/features/products/types/products.types";

export function useDashboard(
  tenant: SalesTenantContext & InventoryTenantContext & ProductsTenantContext,
  actor: InventoryActorContext
) {
  const [state, setState] = useState<DashboardUiState>({
    isLoading: false,
    data: null,
    lastError: null
  });

  const tenantRef = useRef(tenant);
  const actorRef = useRef(actor);

  useEffect(() => {
    tenantRef.current = tenant;
    actorRef.current = actor;
  }, [tenant, actor]);

  const loadData = useCallback(async () => {
    setState(s => ({ ...s, isLoading: true, lastError: null }));
    
    const result = await dashboardService.getDashboardData(tenantRef.current, actorRef.current);
    
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

  useEffect(() => {
    const offSync = eventBus.on("SYNC.REFRESH_TABLE", () => {
      void loadData();
    });

    const offSale = eventBus.on("SALE.COMPLETED", () => void loadData());
    const offProduct = eventBus.on("PRODUCT.CREATED", () => void loadData());
    const offInventory = eventBus.on("INVENTORY.STOCK_MOVEMENT_RECORDED", () => void loadData());

    return () => {
      offSync();
      offSale();
      offProduct();
      offInventory();
    };
  }, [loadData]);

  const invalidateCache = useCallback(() => {
    dashboardService.invalidateCache();
  }, []);

  return {
    state,
    loadData,
    invalidateCache
  };
}
