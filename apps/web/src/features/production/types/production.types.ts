import type { AppError } from "@logiscore/core";

export interface ProductionTenantContext {
  tenantSlug: string;
}

export interface ProductionActorPermissions {
  canApplyDiscount: boolean;
  maxDiscountPercent: number;
  canApplyCustomPrice: boolean;
  canVoidSale: boolean;
  canRefundSale: boolean;
  canVoidInvoice: boolean;
  canAdjustStock: boolean;
  allowedWarehouseLocalIds?: string[];
}

export interface ProductionActorContext {
  role: "owner" | "employee" | "super_admin";
  userId?: string;
  permissions: ProductionActorPermissions;
}

export interface RecipeIngredient {
  productLocalId: string;
  requiredQty: number;
}

export interface Recipe {
  localId: string;
  tenantId: string;
  productLocalId: string;
  name: string;
  yieldQty: number;
  ingredients: RecipeIngredient[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface ProductionOrder {
  localId: string;
  tenantId: string;
  recipeLocalId: string;
  warehouseLocalId: string;
  plannedQty: number;
  producedQty?: number;
  status: "draft" | "in_progress" | "completed" | "cancelled";
  createdBy?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface ProductionLog {
  localId: string;
  tenantId: string;
  productionOrderLocalId: string;
  recipeLocalId: string;
  warehouseLocalId: string;
  plannedQty: number;
  producedQty: number;
  ingredientsUsed: RecipeIngredient[];
  variancePercent: number;
  createdBy?: string;
  createdAt: string;
  deletedAt?: string;
}

export interface CreateRecipeInput {
  productLocalId: string;
  name: string;
  yieldQty: number;
  ingredients: RecipeIngredient[];
}

export interface CreateProductionOrderInput {
  recipeLocalId: string;
  warehouseLocalId: string;
  plannedQty: number;
}

export interface StartProductionOrderInput {
  productionOrderLocalId: string;
}

export interface CompleteProductionOrderInput {
  productionOrderLocalId: string;
  producedQty: number;
}

export interface ProductionUiState {
  isLoading: boolean;
  isSubmitting: boolean;
  recipes: Recipe[];
  orders: ProductionOrder[];
  logs: ProductionLog[];
  lastError: AppError | null;
}
