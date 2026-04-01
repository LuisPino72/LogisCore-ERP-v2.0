import type { AppError } from "@logiscore/core";

export interface PurchasesTenantContext {
  tenantSlug: string;
}

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

export interface PurchasesActorContext {
  role: "owner" | "employee" | "super_admin";
  userId?: string;
  permissions: PurchasesActorPermissions;
}

export interface PurchaseItem {
  productLocalId: string;
  qty: number;
  unitCost: number;
}

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

export interface ReceivingItem {
  productLocalId: string;
  qty: number;
  unitCost: number;
}

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

export interface CreatePurchaseInput {
  warehouseLocalId: string;
  supplierName?: string;
  items: PurchaseItem[];
}

export interface ReceivePurchaseInput {
  purchaseLocalId: string;
  notes?: string;
}

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
  isLoading: boolean;
  isSubmitting: boolean;
  purchases: Purchase[];
  receivings: Receiving[];
  inventoryLots: InventoryLot[];
  lastError: AppError | null;
}
