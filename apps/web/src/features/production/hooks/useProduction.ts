/**
 * Hook personalizado para gestionar la producción.
 * Provee estado y métodos para:
 * - Listar recetas, órdenes y logs de producción
 * - Crear recetas y órdenes de producción
 * - Iniciar y completar órdenes de producción
 * Utiliza el patrón Result<T, AppError> para manejo de errores.
 */

import { useCallback, useState, useRef, useEffect } from "react";
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
  const serviceRef = useRef(service);
  const tenantRef = useRef(tenant);
  const actorRef = useRef(actor);

  useEffect(() => {
    serviceRef.current = service;
    tenantRef.current = tenant;
    actorRef.current = actor;
  }, [service, tenant, actor]);

  const refresh = useCallback(async () => {
    setState((previous) => ({ ...previous, isLoading: true, lastError: null }));
    const [recipesResult, ordersResult, logsResult] = await Promise.all([
      serviceRef.current.listRecipes(tenantRef.current),
      serviceRef.current.listProductionOrders(tenantRef.current),
      serviceRef.current.listProductionLogs(tenantRef.current)
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
  }, []);

  const createRecipe = useCallback(
    async (input: CreateRecipeInput) => {
      setState((previous) => ({ ...previous, isSubmitting: true, lastError: null }));
      const result = await serviceRef.current.createRecipe(tenantRef.current, actorRef.current, input);
      if (!result.ok) {
        setState((previous) => ({ ...previous, isSubmitting: false, lastError: result.error }));
        return null;
      }
      setState((previous) => ({ ...previous, isSubmitting: false, lastError: null }));
      refresh();
      return result.data;
    },
    [refresh]
  );

  const createProductionOrder = useCallback(
    async (input: CreateProductionOrderInput) => {
      setState((previous) => ({ ...previous, isSubmitting: true, lastError: null }));
      const result = await serviceRef.current.createProductionOrder(tenantRef.current, actorRef.current, input);
      if (!result.ok) {
        setState((previous) => ({ ...previous, isSubmitting: false, lastError: result.error }));
        return null;
      }
      setState((previous) => ({ ...previous, isSubmitting: false, lastError: null }));
      refresh();
      return result.data;
    },
    [refresh]
  );

  const startProductionOrder = useCallback(
    async (input: StartProductionOrderInput) => {
      setState((previous) => ({ ...previous, isSubmitting: true, lastError: null }));
      const result = await serviceRef.current.startProductionOrder(tenantRef.current, actorRef.current, input);
      if (!result.ok) {
        setState((previous) => ({ ...previous, isSubmitting: false, lastError: result.error }));
        return null;
      }
      setState((previous) => ({ ...previous, isSubmitting: false, lastError: null }));
      refresh();
      return result.data;
    },
    [refresh]
  );

  const completeProductionOrder = useCallback(
    async (input: CompleteProductionOrderInput) => {
      setState((previous) => ({ ...previous, isSubmitting: true, lastError: null }));
      const result = await serviceRef.current.completeProductionOrder(tenantRef.current, actorRef.current, input);
      if (!result.ok) {
        setState((previous) => ({ ...previous, isSubmitting: false, lastError: result.error }));
        return null;
      }
      setState((previous) => ({ ...previous, isSubmitting: false, lastError: null }));
      refresh();
      return result.data;
    },
    [refresh]
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