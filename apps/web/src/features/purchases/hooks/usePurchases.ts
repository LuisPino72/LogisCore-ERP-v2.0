import { useCallback, useState } from "react";
import type { PurchasesService } from "../services/purchases.service";
import { purchasesService } from "../services/purchases.service.instance";
import type {
  CreatePurchaseInput,
  PurchasesActorContext,
  PurchasesCatalogCreateCategoryCommand,
  PurchasesCatalogCreatePresentationCommand,
  PurchasesCatalogCreateProductCommand,
  PurchasesTenantContext,
  ReceivePurchaseInput,
  PurchasesUiState
} from "../types/purchases.types";

const initialState: PurchasesUiState = {
  isLoading: false,
  isSubmitting: false,
  purchases: [],
  receivings: [],
  inventoryLots: [],
  lastError: null
};

interface UsePurchasesOptions {
  service?: PurchasesService;
  tenant: PurchasesTenantContext;
  actor: PurchasesActorContext;
}

export const usePurchases = ({
  service = purchasesService,
  tenant,
  actor
}: UsePurchasesOptions) => {
  const [state, setState] = useState<PurchasesUiState>(initialState);

  const refresh = useCallback(async () => {
    setState((previous) => ({ ...previous, isLoading: true, lastError: null }));
    const [purchasesResult, receivingsResult, lotsResult] = await Promise.all([
      service.listPurchases(tenant),
      service.listReceivings(tenant),
      service.listInventoryLots(tenant)
    ]);

    if (!purchasesResult.ok) {
      setState((previous) => ({
        ...previous,
        isLoading: false,
        lastError: purchasesResult.error
      }));
      return;
    }
    if (!receivingsResult.ok) {
      setState((previous) => ({
        ...previous,
        isLoading: false,
        lastError: receivingsResult.error
      }));
      return;
    }
    if (!lotsResult.ok) {
      setState((previous) => ({
        ...previous,
        isLoading: false,
        lastError: lotsResult.error
      }));
      return;
    }

    setState((previous) => ({
      ...previous,
      isLoading: false,
      purchases: purchasesResult.data,
      receivings: receivingsResult.data,
      inventoryLots: lotsResult.data,
      lastError: null
    }));
  }, [service, tenant]);

  const requestCreateCategory = useCallback(
    async (input: PurchasesCatalogCreateCategoryCommand) => {
      setState((previous) => ({ ...previous, isSubmitting: true, lastError: null }));
      const result = await service.requestCreateCategory(input);
      if (!result.ok) {
        setState((previous) => ({
          ...previous,
          isSubmitting: false,
          lastError: result.error
        }));
        return;
      }
      setState((previous) => ({ ...previous, isSubmitting: false, lastError: null }));
    },
    [service]
  );

  const requestCreateProduct = useCallback(
    async (input: PurchasesCatalogCreateProductCommand) => {
      setState((previous) => ({ ...previous, isSubmitting: true, lastError: null }));
      const result = await service.requestCreateProduct(input);
      if (!result.ok) {
        setState((previous) => ({
          ...previous,
          isSubmitting: false,
          lastError: result.error
        }));
        return;
      }
      setState((previous) => ({ ...previous, isSubmitting: false, lastError: null }));
    },
    [service]
  );

  const requestCreatePresentation = useCallback(
    async (input: PurchasesCatalogCreatePresentationCommand) => {
      setState((previous) => ({ ...previous, isSubmitting: true, lastError: null }));
      const result = await service.requestCreatePresentation(input);
      if (!result.ok) {
        setState((previous) => ({
          ...previous,
          isSubmitting: false,
          lastError: result.error
        }));
        return;
      }
      setState((previous) => ({ ...previous, isSubmitting: false, lastError: null }));
    },
    [service]
  );

  const createPurchase = useCallback(
    async (input: CreatePurchaseInput) => {
      setState((previous) => ({ ...previous, isSubmitting: true, lastError: null }));
      const result = await service.createPurchase(tenant, actor, input);
      if (!result.ok) {
        setState((previous) => ({
          ...previous,
          isSubmitting: false,
          lastError: result.error
        }));
        return null;
      }
      setState((previous) => ({ ...previous, isSubmitting: false, lastError: null }));
      await refresh();
      return result.data;
    },
    [actor, refresh, service, tenant]
  );

  const receivePurchase = useCallback(
    async (input: ReceivePurchaseInput) => {
      setState((previous) => ({ ...previous, isSubmitting: true, lastError: null }));
      const result = await service.receivePurchase(tenant, actor, input);
      if (!result.ok) {
        setState((previous) => ({
          ...previous,
          isSubmitting: false,
          lastError: result.error
        }));
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
    requestCreateCategory,
    requestCreateProduct,
    requestCreatePresentation,
    createPurchase,
    receivePurchase
  };
};
