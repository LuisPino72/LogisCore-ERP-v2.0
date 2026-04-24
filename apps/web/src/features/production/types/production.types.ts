import type { AppError } from "@logiscore/core";

/**
 * Contexto del tenant para operaciones de producción.
 * Identifica el tenant (empresa/organización) en curso.
 */
export interface ProductionTenantContext {
  tenantSlug: string;
  features?: Record<string, boolean>;
}

/**
 * Permisos del actor para operaciones de producción.
 * Define qué operaciones puede realizar el usuario actual.
 */
export interface ProductionActorPermissions {
  canApplyDiscount: boolean;
  maxDiscountPercent: number;
  canApplyCustomPrice: boolean;
  canVoidSale: boolean;
  canRefundSale: boolean;
  canVoidInvoice: boolean;
  canAdjustStock: boolean;
  allowedWarehouseLocalIds?: string[];
  canCreatePurchaseOrders?: boolean;
  canApprovePurchaseOrders?: boolean;
  canCreateProductionOrders?: boolean;
  canApproveProductionOrders?: boolean;
  canManageUsers?: boolean;
  canManageTenants?: boolean;
}

/**
 * Contexto del actor (usuario) para operaciones de producción.
 * Combina el rol y los permisos del usuario.
 */
export interface ProductionActorContext {
  role: "owner" | "employee" | "admin";
  userId?: string;
  permissions: ProductionActorPermissions;
}

/**
 * Ingrediente requerido para una receta de producción.
 */
export interface RecipeIngredient {
  productLocalId: string;
  productName?: string;
  requiredQty: number;
  isWeighted?: boolean;
}

/**
 * Ingrediente con información extendida para UI.
 */
export interface RecipeIngredientWithDetails extends RecipeIngredient {
  productName: string;
  stockAvailable?: number;
}

/**
 * Receta de producción (lista de materiales - BOM).
 * Define los ingredientes necesarios para producir un producto.
 */
export interface Recipe {
  localId: string;
  tenantId: string;
  productLocalId: string;
  name: string;
  yieldQty: number;
  bomVersion?: string | null;
  ingredients: RecipeIngredient[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

/**
 * Orden de producción.
 * Representa una orden de fabricación con estado y seguimiento.
 */
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

/**
 * Log de producción.
 * Registro histórico de una orden de producción completada.
 */
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

export interface RecipeVersion {
  id: string;
  tenant_id: string;
  recipe_id: string;
  version_number: number;
  created_at: string;
  updated_at: string;
}

export interface RecipeVersionIngredient {
  recipe_version_id: string;
  variant_id: string;
  quantity: number;
  unit: string;
}

/**
 * Datos de entrada para crear una nueva receta.

 */
export interface CreateRecipeInput {
  productLocalId: string;
  name: string;
  yieldQty: number;
  bomVersion?: string;
  ingredients: RecipeIngredient[];
}

/**
 * Datos de entrada para crear una orden de producción.
 */
export interface CreateProductionOrderInput {
  recipeLocalId: string;
  warehouseLocalId: string;
  plannedQty: number;
}

/**
 * Datos de entrada para iniciar una orden de producción.
 */
export interface StartProductionOrderInput {
  productionOrderLocalId: string;
}

/**
 * Datos de entrada para completar una orden de producción.
 */
export interface CompleteProductionOrderInput {
  productionOrderLocalId: string;
  producedQty: number;
}

/**
 * Estado de la UI para el módulo de producción.
 */
export interface ProductionUiState {
  isLoading: boolean;
  isSubmitting: boolean;
  recipes: Recipe[];
  orders: ProductionOrder[];
  logs: ProductionLog[];
  lastError: AppError | null;
}
