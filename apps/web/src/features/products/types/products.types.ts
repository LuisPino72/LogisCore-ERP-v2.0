/**
 * Módulo de Productos y Catálogo
 * Gestiona productos, categorías y presentaciones (variantes)
 */

import type { AppError } from "@logiscore/core";

/** Contexto del tenant para el módulo de productos */
export interface ProductsTenantContext {
  tenantSlug: string;
}

/**
 * Categoría de productos
 * localId: ID único generado en cliente
 * tenantId: Slug del tenant
 * name: Nombre de la categoría
 * deletedAt: Fecha de borrado lógico (null si está activa)
 */
export interface Category {
  localId: string;
  tenantId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

/**
 * Presentación (variante) de un producto
 * id: UUID generado por Supabase
 * productLocalId: Referencia al producto padre
 * factor: Multiplicador para convertir a unidad base
 * price: Precio en USD (se calcula Bs dinámicamente)
 * isDefault: Si es la presentación por defecto al vender
 */
export interface ProductPresentation {
  id: string;
  tenantId: string;
  productLocalId: string;
  name: string;
  factor: number;
  price?: number;
  barcode?: string;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Producto en el catálogo
 * sku: Código único del producto
 * visible: Si aparece en POS y ventas
 * isSerialized: Si usa control de seriales
 * categoryId: FK a Category.local_id
 * defaultPresentationId: FK a ProductPresentation.id
 */
export interface Product {
  localId: string;
  tenantId: string;
  name: string;
  sku: string;
  visible: boolean;
  createdAt: string;
  updatedAt: string;
  description?: string | null;
  categoryId?: string | null;
  weight?: number | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  isSerialized?: boolean | null;
  isTaxable?: boolean | null;
  defaultPresentationId?: string | null;
  deletedAt?: string | null;
}

/**
 * Permisos del actor en el módulo de productos
 * Controla qué operaciones puede realizar cada rol
 */
export interface ProductsActorPermissions {
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

/** Contexto del actor (usuario) */
export interface ProductsActorContext {
  role: "owner" | "employee" | "admin";
  permissions: ProductsActorPermissions;
}

/** Input para crear una categoría */
export interface CreateCategoryInput {
  name: string;
  sourceModule: "purchases";
}

/** Input para actualizar una categoría */
export interface UpdateCategoryInput {
  localId: string;
  name: string;
}

/**
 * Input para crear un producto
 * sourceModule: Módulo que origina la creación (solo purchases por ahora)
 */
export interface CreateProductInput {
  name: string;
  description?: string;
  categoryId?: string;
  sku: string;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  isSerialized?: boolean;
  isTaxable?: boolean;
  visible: boolean;
  defaultPresentationId?: string;
  sourceModule: "purchases";
}

/** Input para actualizar un producto */
export interface UpdateProductInput {
  localId: string;
  name: string;
  description?: string;
  categoryId?: string;
  sku: string;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  isSerialized?: boolean;
  isTaxable?: boolean;
  visible: boolean;
  defaultPresentationId?: string;
}

/**
 * Input para crear una presentación (variante)
 * factor: Cantidad de unidades base que representa esta presentación
 * price: Precio en USD (se calcula Bs dinámicamente)
 */
export interface CreateProductPresentationInput {
  productLocalId: string;
  name: string;
  factor: number;
  price?: number;
  barcode?: string;
  isDefault?: boolean;
}

/** Input para actualizar una presentación */
export interface UpdateProductPresentationInput {
  id: string;
  name: string;
  factor: number;
  price?: number;
  barcode?: string;
  isDefault?: boolean;
}

/**
 * Estado de la UI para el módulo de productos
 */
export interface ProductsUiState {
  isLoading: boolean;
  categories: Category[];
  products: Product[];
  presentations: ProductPresentation[];
  lastError: AppError | null;
}
