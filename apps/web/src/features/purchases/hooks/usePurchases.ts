import { useCallback, useState } from "react";
import type { PurchasesService } from "../services/purchases.service";
import { purchasesService } from "../services/purchases.service.instance";
import type {
  PurchasesCatalogCreateCategoryCommand,
  PurchasesCatalogCreatePresentationCommand,
  PurchasesCatalogCreateProductCommand,
  PurchasesUiState
} from "../types/purchases.types";

const initialState: PurchasesUiState = {
  isSubmitting: false,
  lastError: null
};

interface UsePurchasesOptions {
  service?: PurchasesService;
}

export const usePurchases = ({
  service = purchasesService
}: UsePurchasesOptions = {}) => {
  const [state, setState] = useState<PurchasesUiState>(initialState);

  const requestCreateCategory = useCallback(
    async (input: PurchasesCatalogCreateCategoryCommand) => {
      setState((previous) => ({ ...previous, isSubmitting: true, lastError: null }));
      const result = service.requestCreateCategory(input);
      if (!result.ok) {
        setState({ isSubmitting: false, lastError: result.error });
        return;
      }
      setState({ isSubmitting: false, lastError: null });
    },
    [service]
  );

  const requestCreateProduct = useCallback(
    async (input: PurchasesCatalogCreateProductCommand) => {
      setState((previous) => ({ ...previous, isSubmitting: true, lastError: null }));
      const result = service.requestCreateProduct(input);
      if (!result.ok) {
        setState({ isSubmitting: false, lastError: result.error });
        return;
      }
      setState({ isSubmitting: false, lastError: null });
    },
    [service]
  );

  const requestCreatePresentation = useCallback(
    async (input: PurchasesCatalogCreatePresentationCommand) => {
      setState((previous) => ({ ...previous, isSubmitting: true, lastError: null }));
      const result = service.requestCreatePresentation(input);
      if (!result.ok) {
        setState({ isSubmitting: false, lastError: result.error });
        return;
      }
      setState({ isSubmitting: false, lastError: null });
    },
    [service]
  );

  return {
    state,
    requestCreateCategory,
    requestCreateProduct,
    requestCreatePresentation
  };
};
