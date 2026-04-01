import type { AppError } from "@logiscore/core";

export interface ProductsTenantContext {
  tenantSlug: string;
}

export interface Category {
  localId: string;
  tenantId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface ProductPresentation {
  id: string;
  tenantId: string;
  productLocalId: string;
  name: string;
  factor: number;
  barcode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  localId: string;
  tenantId: string;
  name: string;
  categoryId?: string;
  visible: boolean;
  defaultPresentationId?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface ProductsActorPermissions {
  canApplyDiscount: boolean;
  maxDiscountPercent: number;
  canApplyCustomPrice: boolean;
  canVoidSale: boolean;
  canRefundSale: boolean;
  canVoidInvoice: boolean;
  canAdjustStock: boolean;
}

export interface ProductsActorContext {
  role: "owner" | "employee" | "super_admin";
  permissions: ProductsActorPermissions;
}

export interface CreateCategoryInput {
  name: string;
  sourceModule: "purchases";
}

export interface UpdateCategoryInput {
  localId: string;
  name: string;
}

export interface CreateProductInput {
  name: string;
  categoryId?: string;
  visible: boolean;
  defaultPresentationId?: string;
  sourceModule: "purchases";
}

export interface UpdateProductInput {
  localId: string;
  name: string;
  categoryId?: string;
  visible: boolean;
  defaultPresentationId?: string;
}

export interface CreateProductPresentationInput {
  productLocalId: string;
  name: string;
  factor: number;
  barcode?: string;
}

export interface ProductsUiState {
  isLoading: boolean;
  categories: Category[];
  products: Product[];
  presentations: ProductPresentation[];
  lastError: AppError | null;
}
