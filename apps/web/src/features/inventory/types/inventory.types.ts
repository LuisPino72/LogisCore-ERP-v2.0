import type { AppError } from "@logiscore/core";
import type { StockMovementType } from "@/lib/db/dexie";

export interface InventoryTenantContext {
  tenantSlug: string;
}

export interface InventoryActorContext {
  role: "super_admin" | "owner" | "employee";
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
  };
}

export interface Warehouse {
  localId: string;
  tenantId: string;
  name: string;
  code?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface ProductSizeColor {
  localId: string;
  tenantId: string;
  productLocalId: string;
  size?: string;
  color?: string;
  skuSuffix?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

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
  notes?: string;
  createdBy?: string;
  createdAt: string;
  deletedAt?: string;
}

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

export interface CreateWarehouseInput {
  name: string;
  code?: string;
}

export interface CreateProductSizeColorInput {
  productLocalId: string;
  size?: string;
  color?: string;
  skuSuffix?: string;
}

export interface RecordStockMovementInput {
  productLocalId: string;
  warehouseLocalId: string;
  movementType: StockMovementType;
  quantity: number;
  unitCost?: number;
  referenceType?: string;
  referenceLocalId?: string;
  notes?: string;
}

export interface CreateInventoryCountInput {
  warehouseLocalId: string;
  productLocalId: string;
  countedQty: number;
  reason?: string;
}

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

export interface ReorderSuggestion {
  productLocalId: string;
  warehouseLocalId: string;
  currentStock: number;
  minStock: number;
  targetStock: number;
  suggestedOrderQty: number;
}
