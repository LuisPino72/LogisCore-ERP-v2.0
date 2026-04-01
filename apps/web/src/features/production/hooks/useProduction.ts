import { useCallback, useState } from "react";
import { productionService } from "../services/production.service.instance";
import type { ProductionService } from "../services/production.service";
import type {
  CompleteProductionOrderInput,
  CreateProductionOrderInput,
  CreateRecipeInput,
  ProductionActorContext,
  ProductionTenantContext,
  ProductionUiState,
  StartProductionOrderInput
} from "../types/production.types";

const initialState: ProductionUiState = {
  isLoading: false,
  isSubmitting: false,
  recipes: [],
  orders: [],
  logs: [],
  lastError: null
};

interface UseProductionOptions {
  service?: ProductionService;
  tenant: ProductionTenantContext;
  actor: ProductionActorContext;
}

export const useProduction = ({
  service = productionService,
  tenant,
  actor
}: UseProductionOptions) => {
  const [state, setState] = useState<ProductionUiState>(initialState);

  const refresh = useCallback(async () => {
    setState((previous) => ({ ...previous, isLoading: true, lastError: null }));
    const [recipesResult, ordersResult, logsResult] = await Promise.all([
      service.listRecipes(tenant),
      service.listProductionOrders(tenant),
      service.listProductionLogs(tenant)
    ]);

    if (!recipesResult.ok) {
      setState((previous) => ({ ...previous, isLoading: false, lastError: recipesResult.error }));
      return;
    }
    if (!ordersResult.ok) {
      setState((previous) => ({ ...previous, isLoading: false, lastError: ordersResult.error }));
      return;
    }
    if (!logsResult.ok) {
      setState((previous) => ({ ...previous, isLoading: false, lastError: logsResult.error }));
      return;
    }

    setState((previous) => ({
      ...previous,
      isLoading: false,
      recipes: recipesResult.data,
      orders: ordersResult.data,
      logs: logsResult.data,
      lastError: null
    }));
  }, [service, tenant]);

  const createRecipe = useCallback(
    async (input: CreateRecipeInput) => {
      setState((previous) => ({ ...previous, isSubmitting: true, lastError: null }));
      const result = await service.createRecipe(tenant, actor, input);
      if (!result.ok) {
        setState((previous) => ({ ...previous, isSubmitting: false, lastError: result.error }));
        return null;
      }
      setState((previous) => ({ ...previous, isSubmitting: false, lastError: null }));
      await refresh();
      return result.data;
    },
    [actor, refresh, service, tenant]
  );

  const createProductionOrder = useCallback(
    async (input: CreateProductionOrderInput) => {
      setState((previous) => ({ ...previous, isSubmitting: true, lastError: null }));
      const result = await service.createProductionOrder(tenant, actor, input);
      if (!result.ok) {
        setState((previous) => ({ ...previous, isSubmitting: false, lastError: result.error }));
        return null;
      }
      setState((previous) => ({ ...previous, isSubmitting: false, lastError: null }));
      await refresh();
      return result.data;
    },
    [actor, refresh, service, tenant]
  );

  const startProductionOrder = useCallback(
    async (input: StartProductionOrderInput) => {
      setState((previous) => ({ ...previous, isSubmitting: true, lastError: null }));
      const result = await service.startProductionOrder(tenant, actor, input);
      if (!result.ok) {
        setState((previous) => ({ ...previous, isSubmitting: false, lastError: result.error }));
        return null;
      }
      setState((previous) => ({ ...previous, isSubmitting: false, lastError: null }));
      await refresh();
      return result.data;
    },
    [actor, refresh, service, tenant]
  );

  const completeProductionOrder = useCallback(
    async (input: CompleteProductionOrderInput) => {
      setState((previous) => ({ ...previous, isSubmitting: true, lastError: null }));
      const result = await service.completeProductionOrder(tenant, actor, input);
      if (!result.ok) {
        setState((previous) => ({ ...previous, isSubmitting: false, lastError: result.error }));
        return null;
      }
      setState((previous) => ({ ...previous, isSubmitting: false, lastError: null }));
      await refresh();
      return result.data;
    },
    [actor, refresh, service, tenant]
  );

  return {
    state,
    refresh,
    createRecipe,
    createProductionOrder,
    startProductionOrder,
    completeProductionOrder
  };
};
