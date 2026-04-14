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
  role: "owner" | "employee" | "admin";
  userId?: string;
  permissions: PurchasesActorPermissions;
}

export interface Supplier {
  localId: string;
  tenantId: string;
  name: string;
  rif?: string;
  phone?: string;
  contactPerson?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export type PurchaseStatus = "draft" | "confirmed" | "partial_received" | "received" | "cancelled";

export interface PurchaseItem {
  productLocalId: string;
  qty: number;
  unitCost: number;
}

export interface PurchaseReceivedItem {
  productLocalId: string;
  qtyOrdered: number;
  qtyReceived: number;
}

export interface Purchase {
  localId: string;
  tenantId: string;
  warehouseLocalId: string;
  supplierLocalId?: string;
  supplierName?: string;
  status: PurchaseStatus;
  currency: "VES" | "USD";
  exchangeRate: number;
  subtotal: number;
  total: number;
  items: PurchaseItem[];
  receivedItems?: PurchaseReceivedItem[];
  createdBy?: string;
  receivedAt?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface ReceivingItem {
  productLocalId: string;
  qty: number;
  isWeighted?: boolean;
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

export interface CreateSupplierInput {
  name: string;
  rif?: string;
  phone?: string;
  contactPerson?: string;
  notes?: string;
}

export interface UpdateSupplierInput {
  localId: string;
  name?: string;
  rif?: string;
  phone?: string;
  contactPerson?: string;
  notes?: string;
}

export interface CreatePurchaseInput {
  warehouseLocalId: string;
  supplierLocalId?: string;
  supplierName?: string;
  items: PurchaseItem[];
}

export interface ReceivePurchaseInput {
  purchaseLocalId: string;
  receivedItems: { productLocalId: string; qty: number }[];
  notes?: string;
}

export interface EditPurchaseInput {
  purchaseLocalId: string;
  items: PurchaseItem[];
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
  suppliers: Supplier[];
  purchases: Purchase[];
  receivings: Receiving[];
  inventoryLots: InventoryLot[];
  lastError: AppError | null;
}
