import { createAppError, err, ok, type AppError, type EventBus, type Result } from "@logiscore/core";
import type {
  PurchasesCatalogCreateCategoryCommand,
  PurchasesCatalogCreatePresentationCommand,
  PurchasesCatalogCreateProductCommand
} from "../types/purchases.types";

export interface PurchasesService {
  requestCreateCategory(
    input: PurchasesCatalogCreateCategoryCommand
  ): Result<void, AppError>;
  requestCreateProduct(
    input: PurchasesCatalogCreateProductCommand
  ): Result<void, AppError>;
  requestCreatePresentation(
    input: PurchasesCatalogCreatePresentationCommand
  ): Result<void, AppError>;
}

interface CreatePurchasesServiceDependencies {
  eventBus: EventBus;
}

export const createPurchasesService = ({
  eventBus
}: CreatePurchasesServiceDependencies): PurchasesService => ({
  requestCreateCategory(input) {
    if (!input.name.trim()) {
      return err(
        createAppError({
          code: "PURCHASES_CATEGORY_NAME_REQUIRED",
          message: "Debe indicar nombre para la categoria.",
          retryable: false
        })
      );
    }

    eventBus.emit("PURCHASES.CATEGORY_CREATE_REQUESTED", input);
    return ok<void>(undefined);
  },

  requestCreateProduct(input) {
    if (!input.name.trim()) {
      return err(
        createAppError({
          code: "PURCHASES_PRODUCT_NAME_REQUIRED",
          message: "Debe indicar nombre para el producto.",
          retryable: false
        })
      );
    }

    eventBus.emit("PURCHASES.PRODUCT_CREATE_REQUESTED", input);
    return ok<void>(undefined);
  },

  requestCreatePresentation(input) {
    if (!input.productLocalId.trim()) {
      return err(
        createAppError({
          code: "PURCHASES_PRESENTATION_PRODUCT_REQUIRED",
          message: "Debe seleccionar un producto para la presentacion.",
          retryable: false
        })
      );
    }
    if (!input.name.trim() || input.factor <= 0) {
      return err(
        createAppError({
          code: "PURCHASES_PRESENTATION_INVALID",
          message: "Presentacion invalida.",
          retryable: false
        })
      );
    }

    eventBus.emit("PURCHASES.PRESENTATION_CREATE_REQUESTED", input);
    return ok<void>(undefined);
  }
});
