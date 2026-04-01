import type { AppError } from "@logiscore/core";

export interface PurchasesCatalogCreateCategoryCommand {
  name: string;
}

export interface PurchasesCatalogCreateProductCommand {
  name: string;
  categoryId?: string;
  visible: boolean;
  defaultPresentationId?: string;
}

export interface PurchasesCatalogCreatePresentationCommand {
  productLocalId: string;
  name: string;
  factor: number;
  barcode?: string;
}

export interface PurchasesUiState {
  isSubmitting: boolean;
  lastError: AppError | null;
}
