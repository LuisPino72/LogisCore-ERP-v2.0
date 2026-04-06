import { useCallback, useState } from "react";
import type { PurchasesService } from "../services/purchases.service";
import { purchasesService } from "../services/purchases.service.instance";
import type {
  CreatePurchaseInput,
  CreateSupplierInput,
  EditPurchaseInput,
  PurchasesActorContext,
  PurchasesCatalogCreateCategoryCommand,
  PurchasesCatalogCreatePresentationCommand,
  PurchasesCatalogCreateProductCommand,
  PurchasesTenantContext,
  ReceivePurchaseInput,
  PurchasesUiState,
  UpdateSupplierInput
} from "../types/purchases.types";

const initialState: PurchasesUiState = {
  isLoading: false,
  isSubmitting: false,
  suppliers: [],
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
    const [suppliersResult, purchasesResult, receivingsResult, lotsResult] = await Promise.all([
      service.listSuppliers(tenant),
      service.listPurchases(tenant),
      service.listReceivings(tenant),
      service.listInventoryLots(tenant)
    ]);

    const firstError = [suppliersResult, purchasesResult, receivingsResult, lotsResult].find(r => !r.ok);
    if (firstError && !firstError.ok) {
      setState((previous) => ({
        ...previous,
        isLoading: false,
        lastError: firstError.error
      }));
      return;
    }

    setState((previous) => ({
      ...previous,
      isLoading: false,
      suppliers: suppliersResult.ok ? suppliersResult.data : [],
      purchases: purchasesResult.ok ? purchasesResult.data : [],
      receivings: receivingsResult.ok ? receivingsResult.data : [],
      inventoryLots: lotsResult.ok ? lotsResult.data : [],
      lastError: null
    }));
  }, [service, tenant]);

  const createSupplier = useCallback(
    async (input: CreateSupplierInput) => {
      setState((previous) => ({ ...previous, isSubmitting: true, lastError: null }));
      const result = await service.createSupplier(tenant, actor, input);
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

  const updateSupplier = useCallback(
    async (input: UpdateSupplierInput) => {
      setState((previous) => ({ ...previous, isSubmitting: true, lastError: null }));
      const result = await service.updateSupplier(tenant, actor, input);
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

  const confirmPurchase = useCallback(
    async (purchaseLocalId: string) => {
      setState((previous) => ({ ...previous, isSubmitting: true, lastError: null }));
      const result = await service.confirmPurchase(tenant, actor, purchaseLocalId);
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

  const cancelPurchase = useCallback(
    async (purchaseLocalId: string) => {
      setState((previous) => ({ ...previous, isSubmitting: true, lastError: null }));
      const result = await service.cancelPurchase(tenant, actor, purchaseLocalId);
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
    [refresh, service, tenant]
  );

  const editPurchase = useCallback(
    async (input: EditPurchaseInput) => {
      setState((previous) => ({ ...previous, isSubmitting: true, lastError: null }));
      const result = await service.editPurchase(tenant, actor, input);
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

  const setProductPreferredSupplier = useCallback(
    async (productLocalId: string, supplierLocalId: string | null) => {
      setState((previous) => ({ ...previous, isSubmitting: true, lastError: null }));
      const result = await service.setProductPreferredSupplier(tenant, productLocalId, supplierLocalId);
      if (!result.ok) {
        setState((previous) => ({
          ...previous,
          isSubmitting: false,
          lastError: result.error
        }));
        return false;
      }
      setState((previous) => ({ ...previous, isSubmitting: false, lastError: null }));
      await refresh();
      return true;
    },
    [actor, refresh, service, tenant]
  );

  return {
    state,
    refresh,
    createSupplier,
    updateSupplier,
    requestCreateCategory,
    requestCreateProduct,
    requestCreatePresentation,
    createPurchase,
    receivePurchase,
    confirmPurchase,
    cancelPurchase,
    editPurchase,
    setProductPreferredSupplier
  };
};