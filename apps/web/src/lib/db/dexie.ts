import Dexie, { type EntityTable } from "dexie";
import type {
  CoreBootstrapState,
  CoreDb,
  SyncErrorRecord,
  SyncQueueItem,
  SyncStorage
} from "@logiscore/core";

interface SyncQueueEntity extends SyncQueueItem {
  status: "pending";
}

export interface CategoryRecord {
  localId: string;
  tenantId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductPresentationRecord {
  id: string;
  tenantId: string;
  productLocalId: string;
  name: string;
  factor: number;
  barcode?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface ProductRecord {
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

export interface WarehouseRecord {
  localId: string;
  tenantId: string;
  name: string;
  code?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface ProductSizeColorRecord {
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

export type StockMovementType =
  | "purchase_in"
  | "sale_out"
  | "adjustment_in"
  | "adjustment_out"
  | "production_in"
  | "production_out"
  | "transfer_in"
  | "transfer_out"
  | "count_adjustment";

export interface StockMovementRecord {
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

export interface InventoryCountRecord {
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

export interface SaleItemRecord {
  productLocalId: string;
  qty: number;
  unitPrice: number;
  unitCost?: number;
  taxAmount?: number;
  discountAmount?: number;
}

export interface SalePaymentRecord {
  method: "cash" | "card" | "transfer" | "mobile" | "mixed";
  currency: "VES" | "USD";
  amount: number;
  reference?: string;
}

export interface SaleRecord {
  localId: string;
  tenantId: string;
  saleNumber?: string;
  warehouseLocalId: string;
  cashierUserId?: string;
  status: "draft" | "completed" | "voided" | "refunded";
  currency: string;
  exchangeRate: number;
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  total: number;
  totalPaid: number;
  changeAmount: number;
  items: SaleItemRecord[];
  payments: SalePaymentRecord[];
  suspendedSourceLocalId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface SuspendedSaleRecord {
  localId: string;
  tenantId: string;
  warehouseLocalId: string;
  cashierUserId?: string;
  status: "open" | "resumed" | "cancelled" | "converted";
  cart: SaleItemRecord[];
  paymentsDraft: SalePaymentRecord[];
  notes?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface BoxClosingRecord {
  localId: string;
  tenantId: string;
  warehouseLocalId: string;
  openedBy?: string;
  closedBy?: string;
  status: "open" | "closed";
  openedAt: string;
  closedAt?: string;
  openingAmount: number;
  expectedAmount?: number;
  countedAmount?: number;
  differenceAmount?: number;
  salesCount?: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface PurchaseItemRecord {
  productLocalId: string;
  qty: number;
  unitCost: number;
}

export interface PurchaseRecord {
  localId: string;
  tenantId: string;
  warehouseLocalId: string;
  supplierName?: string;
  status: "draft" | "received" | "cancelled";
  subtotal: number;
  total: number;
  items: PurchaseItemRecord[];
  createdBy?: string;
  receivedAt?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface ReceivingItemRecord {
  productLocalId: string;
  qty: number;
  unitCost: number;
}

export interface ReceivingRecord {
  localId: string;
  tenantId: string;
  purchaseLocalId: string;
  warehouseLocalId: string;
  status: "posted";
  items: ReceivingItemRecord[];
  totalItems: number;
  totalCost: number;
  receivedBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface InventoryLotRecord {
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
  deletedAt?: string;
}

export interface RecipeIngredientRecord {
  productLocalId: string;
  requiredQty: number;
}

export interface RecipeRecord {
  localId: string;
  tenantId: string;
  productLocalId: string;
  name: string;
  yieldQty: number;
  ingredients: RecipeIngredientRecord[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface ProductionOrderRecord {
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

export interface ProductionLogRecord {
  localId: string;
  tenantId: string;
  productionOrderLocalId: string;
  recipeLocalId: string;
  warehouseLocalId: string;
  plannedQty: number;
  producedQty: number;
  ingredientsUsed: RecipeIngredientRecord[];
  variancePercent: number;
  createdBy?: string;
  createdAt: string;
  deletedAt?: string;
}

export class LogisCoreDexie extends Dexie {
  bootstrap_state!: EntityTable<CoreBootstrapState, "id">;
  sync_queue!: EntityTable<SyncQueueEntity, "id">;
  sync_errors!: EntityTable<SyncErrorRecord, "id">;
  categories!: EntityTable<CategoryRecord, "localId">;
  products!: EntityTable<ProductRecord, "localId">;
  product_presentations!: EntityTable<ProductPresentationRecord, "id">;
  warehouses!: EntityTable<WarehouseRecord, "localId">;
  product_size_colors!: EntityTable<ProductSizeColorRecord, "localId">;
  stock_movements!: EntityTable<StockMovementRecord, "localId">;
  inventory_counts!: EntityTable<InventoryCountRecord, "localId">;
  sales!: EntityTable<SaleRecord, "localId">;
  suspended_sales!: EntityTable<SuspendedSaleRecord, "localId">;
  box_closings!: EntityTable<BoxClosingRecord, "localId">;
  purchases!: EntityTable<PurchaseRecord, "localId">;
  receivings!: EntityTable<ReceivingRecord, "localId">;
  inventory_lots!: EntityTable<InventoryLotRecord, "localId">;
  recipes!: EntityTable<RecipeRecord, "localId">;
  production_orders!: EntityTable<ProductionOrderRecord, "localId">;
  production_logs!: EntityTable<ProductionLogRecord, "localId">;

  constructor() {
    super("logiscore_erp");
    this.version(1).stores({
      bootstrap_state: "&id, tenantId, userId, bootstrappedAt",
      sync_queue: "&id, tenantId, table, operation, createdAt, attempts, status",
      sync_errors: "&id, queueItemId, tenantId, failedAt"
    });
    this.version(2).stores({
      bootstrap_state: "&id, tenantId, userId, bootstrappedAt",
      sync_queue: "&id, tenantId, table, operation, createdAt, attempts, status",
      sync_errors: "&id, queueItemId, tenantId, failedAt",
      categories: "&localId, tenantId, name, createdAt",
      products:
        "&localId, tenantId, categoryId, visible, defaultPresentationId, createdAt",
      product_presentations: "&id, tenantId, productLocalId, name, createdAt"
    });
    this.version(3).stores({
      bootstrap_state: "&id, tenantId, userId, bootstrappedAt",
      sync_queue: "&id, tenantId, table, operation, createdAt, attempts, status",
      sync_errors: "&id, queueItemId, tenantId, failedAt",
      categories: "&localId, tenantId, name, createdAt",
      products:
        "&localId, tenantId, categoryId, visible, defaultPresentationId, createdAt",
      product_presentations: "&id, tenantId, productLocalId, name, createdAt",
      warehouses: "&localId, tenantId, name, code, createdAt",
      product_size_colors: "&localId, tenantId, productLocalId, size, color, createdAt",
      stock_movements:
        "&localId, tenantId, productLocalId, warehouseLocalId, movementType, createdAt",
      inventory_counts:
        "&localId, tenantId, warehouseLocalId, productLocalId, status, createdAt"
    });
    this.version(4).stores({
      bootstrap_state: "&id, tenantId, userId, bootstrappedAt",
      sync_queue: "&id, tenantId, table, operation, createdAt, attempts, status",
      sync_errors: "&id, queueItemId, tenantId, failedAt",
      categories: "&localId, tenantId, name, createdAt",
      products:
        "&localId, tenantId, categoryId, visible, defaultPresentationId, createdAt",
      product_presentations: "&id, tenantId, productLocalId, name, createdAt",
      warehouses: "&localId, tenantId, name, code, createdAt",
      product_size_colors: "&localId, tenantId, productLocalId, size, color, createdAt",
      stock_movements:
        "&localId, tenantId, productLocalId, warehouseLocalId, movementType, createdAt",
      inventory_counts:
        "&localId, tenantId, warehouseLocalId, productLocalId, status, createdAt",
      sales: "&localId, tenantId, warehouseLocalId, status, createdAt",
      suspended_sales: "&localId, tenantId, warehouseLocalId, status, createdAt",
      box_closings: "&localId, tenantId, warehouseLocalId, status, createdAt"
    });
    this.version(5).stores({
      bootstrap_state: "&id, tenantId, userId, bootstrappedAt",
      sync_queue: "&id, tenantId, table, operation, createdAt, attempts, status",
      sync_errors: "&id, queueItemId, tenantId, failedAt",
      categories: "&localId, tenantId, name, createdAt",
      products:
        "&localId, tenantId, categoryId, visible, defaultPresentationId, createdAt",
      product_presentations: "&id, tenantId, productLocalId, name, createdAt",
      warehouses: "&localId, tenantId, name, code, createdAt",
      product_size_colors: "&localId, tenantId, productLocalId, size, color, createdAt",
      stock_movements:
        "&localId, tenantId, productLocalId, warehouseLocalId, movementType, createdAt",
      inventory_counts:
        "&localId, tenantId, warehouseLocalId, productLocalId, status, createdAt",
      sales: "&localId, tenantId, warehouseLocalId, status, createdAt",
      suspended_sales: "&localId, tenantId, warehouseLocalId, status, createdAt",
      box_closings: "&localId, tenantId, warehouseLocalId, status, createdAt",
      purchases: "&localId, tenantId, warehouseLocalId, status, createdAt",
      receivings: "&localId, tenantId, purchaseLocalId, warehouseLocalId, createdAt"
    });
    this.version(6).stores({
      bootstrap_state: "&id, tenantId, userId, bootstrappedAt",
      sync_queue: "&id, tenantId, table, operation, createdAt, attempts, status",
      sync_errors: "&id, queueItemId, tenantId, failedAt",
      categories: "&localId, tenantId, name, createdAt",
      products:
        "&localId, tenantId, categoryId, visible, defaultPresentationId, createdAt",
      product_presentations: "&id, tenantId, productLocalId, name, createdAt",
      warehouses: "&localId, tenantId, name, code, createdAt",
      product_size_colors: "&localId, tenantId, productLocalId, size, color, createdAt",
      stock_movements:
        "&localId, tenantId, productLocalId, warehouseLocalId, movementType, createdAt",
      inventory_counts:
        "&localId, tenantId, warehouseLocalId, productLocalId, status, createdAt",
      sales: "&localId, tenantId, warehouseLocalId, status, createdAt",
      suspended_sales: "&localId, tenantId, warehouseLocalId, status, createdAt",
      box_closings: "&localId, tenantId, warehouseLocalId, status, createdAt",
      purchases: "&localId, tenantId, warehouseLocalId, status, createdAt",
      receivings: "&localId, tenantId, purchaseLocalId, warehouseLocalId, createdAt",
      inventory_lots:
        "&localId, tenantId, productLocalId, warehouseLocalId, sourceType, sourceLocalId, createdAt"
    });
    this.version(7).stores({
      bootstrap_state: "&id, tenantId, userId, bootstrappedAt",
      sync_queue: "&id, tenantId, table, operation, createdAt, attempts, status",
      sync_errors: "&id, queueItemId, tenantId, failedAt",
      categories: "&localId, tenantId, name, createdAt",
      products:
        "&localId, tenantId, categoryId, visible, defaultPresentationId, createdAt",
      product_presentations: "&id, tenantId, productLocalId, name, createdAt",
      warehouses: "&localId, tenantId, name, code, createdAt",
      product_size_colors: "&localId, tenantId, productLocalId, size, color, createdAt",
      stock_movements:
        "&localId, tenantId, productLocalId, warehouseLocalId, movementType, createdAt",
      inventory_counts:
        "&localId, tenantId, warehouseLocalId, productLocalId, status, createdAt",
      sales: "&localId, tenantId, warehouseLocalId, status, createdAt",
      suspended_sales: "&localId, tenantId, warehouseLocalId, status, createdAt",
      box_closings: "&localId, tenantId, warehouseLocalId, status, createdAt",
      purchases: "&localId, tenantId, warehouseLocalId, status, createdAt",
      receivings: "&localId, tenantId, purchaseLocalId, warehouseLocalId, createdAt",
      inventory_lots:
        "&localId, tenantId, productLocalId, warehouseLocalId, sourceType, sourceLocalId, createdAt",
      recipes: "&localId, tenantId, productLocalId, createdAt",
      production_orders: "&localId, tenantId, recipeLocalId, warehouseLocalId, status, createdAt",
      production_logs:
        "&localId, tenantId, productionOrderLocalId, recipeLocalId, warehouseLocalId, createdAt"
    });
  }
}

export class DexieCoreDbAdapter implements CoreDb {
  constructor(private readonly db: LogisCoreDexie) {}

  async saveBootstrapState(state: CoreBootstrapState): Promise<void> {
    await this.db.bootstrap_state.put(state);
  }

  async getBootstrapState(id: string): Promise<CoreBootstrapState | null> {
    const state = await this.db.bootstrap_state.get(id);
    return state ?? null;
  }
}

export class DexieSyncStorageAdapter implements SyncStorage {
  constructor(private readonly db: LogisCoreDexie) {}

  async addQueueItem(item: SyncQueueItem): Promise<void> {
    await this.db.sync_queue.put({ ...item, status: "pending" });
  }

  async updateQueueAttempts(id: string, attempts: number): Promise<void> {
    await this.db.sync_queue.update(id, { attempts });
  }

  async removeQueueItem(id: string): Promise<void> {
    await this.db.sync_queue.delete(id);
  }

  async getNextQueueItem(): Promise<SyncQueueItem | null> {
    const next = await this.db.sync_queue.orderBy("createdAt").first();
    if (!next) {
      return null;
    }
    const { status, ...item } = next;
    void status;
    return item;
  }

  async addSyncError(error: SyncErrorRecord): Promise<void> {
    await this.db.sync_errors.put(error);
  }
}

export const db = new LogisCoreDexie();
