/**
 * Módulo de Inventario
 * Gestiona almacenes, movimientos de stock, tallas/colores y conteos
 */

import type { AppError } from "@logiscore/core";
import type { StockMovementType } from "@/lib/db/dexie";

export type { StockMovementType };

/** Contexto del tenant */
export interface InventoryTenantContext {
  tenantSlug: string;
}

/** Contexto del actor en inventario */
export interface InventoryActorContext {
  role: "admin" | "owner" | "employee";
  userId?: string;
  permissions: {
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
  };
}

/**
 * Bodega (warehouse)
 * code: Código identificador de la bodega
 * capacityVolumen: Capacidad en metros cúbicos
 * capacityPeso: Capacidad en kilogramos
 * isDefault: Si es la bodega principal
 */
export interface Warehouse {
  localId: string;
  tenantId: string;
  name: string;
  code?: string;
  address?: string;
  contactPerson?: string;
  phone?: string;
  capacityVolumen?: number;
  capacityPeso?: number;
  isActive: boolean;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

/**
 * Variante de producto (talla/color)
 * barcode: Código de barras único para esta variante
 */
export interface ProductSizeColor {
  localId: string;
  tenantId: string;
  productLocalId: string;
  size?: string;
  color?: string;
  skuSuffix?: string;
  barcode?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

/**
 * Movimiento de stock
 * movementType: Tipo de movimiento (entrada/salida)
 * referenceDocumentType: Referencia al documento origen (purchase, sale, etc.)
 * costLayerId: ID de la capa de costo (para FIFO/promedio)
 */
export interface StockMovement {
  localId: string;
  tenantId: string;
  productLocalId: string;
  warehouseLocalId: string;
  movementType: StockMovementType;
  quantity: number;
  unitCost?: number;
  referenceType?: string;
  referenceLocalId?: string;
  referenceDocumentType?: string;
  costLayerId?: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  deletedAt?: string;
}

/**
 * Conteo de inventario
 * status: draft=borrador, posted=contabilizado, voided=anulado
 * expectedQty: Cantidad esperada (calculada desde movimientos)
 * countedQty: Cantidad contada físicamente
 * differenceQty: Diferencia (contada - esperada)
 */
export interface InventoryCount {
  localId: string;
  tenantId: string;
  warehouseLocalId: string;
  productLocalId: string;
  expectedQty: number;
  countedQty: number;
  differenceQty: number;
  status: "draft" | "posted" | "voided";
  reason?: string;
  countedBy?: string;
  countedAt?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

/** Input para crear bodega */
export interface CreateWarehouseInput {
  name: string;
  code?: string;
  address?: string;
  contactPerson?: string;
  phone?: string;
  capacityVolumen?: number;
  capacityPeso?: number;
  isDefault?: boolean;
}

/** Input para crear variante talla/color */
export interface CreateProductSizeColorInput {
  productLocalId: string;
  size?: string;
  color?: string;
  skuSuffix?: string;
  barcode?: string;
}

/**
 * Input para registrar movimiento de stock
 * unitCost: Costo unitario (para actualizar promedio)
 * costLayerId: Para rastrear capas de costo FIFO
 * isWeightedProduct: Si el producto se vende por peso (validación decimal)
 */
export interface RecordStockMovementInput {
  productLocalId: string;
  warehouseLocalId: string;
  movementType: StockMovementType;
  quantity: number;
  unitCost?: number;
  referenceType?: string;
  referenceLocalId?: string;
  referenceDocumentType?: string;
  costLayerId?: string;
  notes?: string;
  isWeightedProduct?: boolean;
}

/** Input para crear conteo de inventario */
export interface CreateInventoryCountInput {
  warehouseLocalId: string;
  productLocalId: string;
  countedQty: number;
  reason?: string;
}

/**
 * Estado de UI del módulo de inventario
 * balances: Stock actual por producto-bodega (key: "productId:warehouseId")
 * reorderSuggestions: Sugerencias de reorden automático
 */
export interface InventoryUiState {
  isLoading: boolean;
  warehouses: Warehouse[];
  movements: StockMovement[];
  counts: InventoryCount[];
  sizeColors: ProductSizeColor[];
  balances: Record<string, number>;
  reorderSuggestions: ReorderSuggestion[];
  lastError: AppError | null;
}

/**
 * Sugerencia de reorden automático
 * suggestedOrderQty: Cantidad sugerida para ordenar
 */
export interface ReorderSuggestion {
  productLocalId: string;
  warehouseLocalId: string;
  currentStock: number;
  minStock: number;
  targetStock: number;
  suggestedOrderQty: number;
}
