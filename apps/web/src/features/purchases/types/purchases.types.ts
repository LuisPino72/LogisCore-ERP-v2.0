import type { AppError } from "@logiscore/core";

/**
 * Contexto del tenant para operaciones de compras.
 * Identifica el tenant (empresa/organización) en curso.
 */
export interface PurchasesTenantContext {
  tenantSlug: string;
}

/**
 * Permisos del actor para operaciones de compras.
 * Define qué operaciones puede realizar el usuario actual.
 */
export interface PurchasesActorPermissions {
  canApplyDiscount: boolean;
  maxDiscountPercent: number;
  canApplyCustomPrice: boolean;
  canVoidSale: boolean;
  canRefundSale: boolean;
  canVoidInvoice: boolean;
  canAdjustStock: boolean;
  allowedWarehouseLocalIds?: string[];
}

/**
 * Contexto del actor (usuario) para operaciones de compras.
 * Combina el rol y los permisos del usuario.
 */
/**
 * Contexto del actor (usuario) para operaciones de compras.
 * Combina el rol y los permisos del usuario.
 */
export interface PurchasesActorContext {
  role: "owner" | "employee" | "super_admin";
  userId?: string;
  permissions: PurchasesActorPermissions;
}

/**
 * Ítem de una orden de compra.
 */
/**
 * Ítem de una orden de compra.
 */
export interface PurchaseItem {
  productLocalId: string;
  qty: number;
  unitCost: number;
}

/**
 * Orden de compra.
 * Representa una solicitud de compra a un proveedor.
 */
export interface Purchase {
  localId: string;
  tenantId: string;
  warehouseLocalId: string;
  supplierName?: string;
  status: "draft" | "received" | "cancelled";
  subtotal: number;
  total: number;
  items: PurchaseItem[];
  createdBy?: string;
  receivedAt?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

/**
 * Ítem de una recepción de compra.
 */
/**
 * Ítem de una recepción de compra.
 */
export interface ReceivingItem {
  productLocalId: string;
  qty: number;
  unitCost: number;
}

/**
 * Recepción de compra.
 * Registra la recepción de productos en bodega.
 */
export interface Receiving {
  localId: string;
  tenantId: string;
  purchaseLocalId: string;
  warehouseLocalId: string;
  status: "posted";
  items: ReceivingItem[];
  totalItems: number;
  totalCost: number;
  receivedBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

/**
 * Lote de inventario.
 * tracking de lotes para control de calidad y caducidad.
 */
export interface InventoryLot {
  localId: string;
  tenantId: string;
  productLocalId: string;
  warehouseLocalId: string;
  sourceType: "purchase_receiving";
  sourceLocalId: string;
  quantity: number;
  unitCost: number;
  status: "active";
  createdAt: string;
  updatedAt: string;
}

/**
 * Datos de entrada para crear una orden de compra.
 */
/**
 * Datos de entrada para crear una orden de compra.
 */
export interface CreatePurchaseInput {
  warehouseLocalId: string;
  supplierName?: string;
  items: PurchaseItem[];
}

/**
 * Datos de entrada para recibir una orden de compra.
 */
/**
 * Datos de entrada para recibir una orden de compra.
 */
export interface ReceivePurchaseInput {
  purchaseLocalId: string;
  notes?: string;
}

/**
 * Comando para crear una categoría en el catálogo de compras.
 */
/**
 * Comando para crear una categoría en el catálogo de compras.
 */
export interface PurchasesCatalogCreateCategoryCommand {
  name: string;
}

/**
 * Comando para crear un producto en el catálogo de compras.
 */
/**
 * Comando para crear un producto en el catálogo de compras.
 */
export interface PurchasesCatalogCreateProductCommand {
  name: string;
  categoryId?: string;
  visible: boolean;
  defaultPresentationId?: string;
}

/**
 * Comando para crear una presentación en el catálogo de compras.
 */
/**
 * Comando para crear una presentación en el catálogo de compras.
 */
export interface PurchasesCatalogCreatePresentationCommand {
  productLocalId: string;
  name: string;
  factor: number;
  barcode?: string;
}

/**
 * Estado de la UI para el módulo de compras.
 */
export interface PurchasesUiState {
  isLoading: boolean;
  isSubmitting: boolean;
  purchases: Purchase[];
  receivings: Receiving[];
  inventoryLots: InventoryLot[];
  lastError: AppError | null;
}
