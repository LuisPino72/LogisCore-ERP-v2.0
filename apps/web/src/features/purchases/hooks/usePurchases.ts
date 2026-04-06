import { useCallback, useState, useRef, useEffect } from "react";
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
    const [suppliersResult, purchasesResult, receivingsResult, lotsResult] = await Promise.all([
      serviceRef.current.listSuppliers(tenantRef.current),
      serviceRef.current.listPurchases(tenantRef.current),
      serviceRef.current.listReceivings(tenantRef.current),
      serviceRef.current.listInventoryLots(tenantRef.current)
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
  }, []);

  const createSupplier = useCallback(
    async (input: CreateSupplierInput) => {
      setState((previous) => ({ ...previous, isSubmitting: true, lastError: null }));
      const result = await serviceRef.current.createSupplier(tenantRef.current, actorRef.current, input);
      if (!result.ok) {
        setState((previous) => ({
          ...previous,
          isSubmitting: false,
          lastError: result.error
        }));
        return null;
      }
      setState((previous) => ({ ...previous, isSubmitting: false, lastError: null }));
      refresh();
      return result.data;
    },
    [refresh]
  );

  const updateSupplier = useCallback(
    async (input: UpdateSupplierInput) => {
      setState((previous) => ({ ...previous, isSubmitting: true, lastError: null }));
      const result = await serviceRef.current.updateSupplier(tenantRef.current, actorRef.current, input);
      if (!result.ok) {
        setState((previous) => ({
          ...previous,
          isSubmitting: false,
          lastError: result.error
        }));
        return null;
      }
      setState((previous) => ({ ...previous, isSubmitting: false, lastError: null }));
      refresh();
      return result.data;
    },
    [refresh]
  );

  const requestCreateCategory = useCallback(
    async (input: PurchasesCatalogCreateCategoryCommand) => {
      setState((previous) => ({ ...previous, isSubmitting: true, lastError: null }));
      const result = await serviceRef.current.requestCreateCategory(input);
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
    []
  );

  const requestCreateProduct = useCallback(
    async (input: PurchasesCatalogCreateProductCommand) => {
      setState((previous) => ({ ...previous, isSubmitting: true, lastError: null }));
      const result = await serviceRef.current.requestCreateProduct(input);
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
    []
  );

  const requestCreatePresentation = useCallback(
    async (input: PurchasesCatalogCreatePresentationCommand) => {
      setState((previous) => ({ ...previous, isSubmitting: true, lastError: null }));
      const result = await serviceRef.current.requestCreatePresentation(input);
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
    []
  );

  const createPurchase = useCallback(
    async (input: CreatePurchaseInput) => {
      setState((previous) => ({ ...previous, isSubmitting: true, lastError: null }));
      const result = await serviceRef.current.createPurchase(tenantRef.current, actorRef.current, input);
      if (!result.ok) {
        setState((previous) => ({
          ...previous,
          isSubmitting: false,
          lastError: result.error
        }));
        return null;
      }
      setState((previous) => ({ ...previous, isSubmitting: false, lastError: null }));
      refresh();
      return result.data;
    },
    [refresh]
  );

  const receivePurchase = useCallback(
    async (input: ReceivePurchaseInput) => {
      setState((previous) => ({ ...previous, isSubmitting: true, lastError: null }));
      const result = await serviceRef.current.receivePurchase(tenantRef.current, actorRef.current, input);
      if (!result.ok) {
        setState((previous) => ({
          ...previous,
          isSubmitting: false,
          lastError: result.error
        }));
        return null;
      }
      setState((previous) => ({ ...previous, isSubmitting: false, lastError: null }));
      refresh();
      return result.data;
    },
    [refresh]
  );

  const confirmPurchase = useCallback(
    async (purchaseLocalId: string) => {
      setState((previous) => ({ ...previous, isSubmitting: true, lastError: null }));
      const result = await serviceRef.current.confirmPurchase(tenantRef.current, actorRef.current, purchaseLocalId);
      if (!result.ok) {
        setState((previous) => ({
          ...previous,
          isSubmitting: false,
          lastError: result.error
        }));
        return null;
      }
      setState((previous) => ({ ...previous, isSubmitting: false, lastError: null }));
      refresh();
      return result.data;
    },
    [refresh]
  );

  const cancelPurchase = useCallback(
    async (purchaseLocalId: string) => {
      setState((previous) => ({ ...previous, isSubmitting: true, lastError: null }));
      const result = await serviceRef.current.cancelPurchase(tenantRef.current, actorRef.current, purchaseLocalId);
      if (!result.ok) {
        setState((previous) => ({
          ...previous,
          isSubmitting: false,
          lastError: result.error
        }));
        return null;
      }
      setState((previous) => ({ ...previous, isSubmitting: false, lastError: null }));
      refresh();
      return result.data;
    },
    [refresh]
  );

  const editPurchase = useCallback(
    async (input: EditPurchaseInput) => {
      setState((previous) => ({ ...previous, isSubmitting: true, lastError: null }));
      const result = await serviceRef.current.editPurchase(tenantRef.current, actorRef.current, input);
      if (!result.ok) {
        setState((previous) => ({
          ...previous,
          isSubmitting: false,
          lastError: result.error
        }));
        return null;
      }
      setState((previous) => ({ ...previous, isSubmitting: false, lastError: null }));
      refresh();
      return result.data;
    },
    [refresh]
  );

  const setProductPreferredSupplier = useCallback(
    async (productLocalId: string, supplierLocalId: string | null) => {
      setState((previous) => ({ ...previous, isSubmitting: true, lastError: null }));
      const result = await serviceRef.current.setProductPreferredSupplier(tenantRef.current, productLocalId, supplierLocalId);
      if (!result.ok) {
        setState((previous) => ({
          ...previous,
          isSubmitting: false,
          lastError: result.error
        }));
        return false;
      }
      setState((previous) => ({ ...previous, isSubmitting: false, lastError: null }));
      refresh();
      return true;
    },
    [refresh]
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