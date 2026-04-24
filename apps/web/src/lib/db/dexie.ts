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
  deletedAt?: string;
}

export interface CatalogRecord {
  localId?: string;
  id?: string;
  tenantId: string;
  name?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface ProductPresentationRecord {
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
  deletedAt?: string;
}

export interface ProductRecord {
  localId: string;
  tenantId: string;
  name: string;
  sku: string;
  visible: boolean;
  description?: string | null;
  categoryId?: string | null;
  weight?: number | null;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  isSerialized?: boolean | null;
  isTaxable?: boolean | null;
  isWeighted?: boolean | null;
  unitOfMeasure?: string | null;
  defaultPresentationId?: string | null;
  preferredSupplierLocalId?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  // Campos para productos globales
  isGlobal?: boolean;
  businessTypeId?: string;
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

export interface ProductAttributeRecord {
  localId: string;
  tenantId: string;
  productLocalId: string;
  name: string;
  value: string;
  type: "text" | "number" | "boolean" | "date";
  displayOrder?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface ProductVariantRecord {
  localId: string;
  tenantId: string;
  productLocalId: string;
  skuVariant?: string;
  nameSuffix?: string;
  priceAdjustment?: number;
  cost?: number;
  stockLevel?: number;
  stockMin?: number;
  stockMax?: number;
  attributeCombination?: string;
  isDefault?: boolean;
  isActive?: boolean;
  weight?: number;
  barcode?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface ProductSerialRecord {
  localId: string;
  tenantId: string;
  variantLocalId: string;
  productLocalId: string;
  serialNumber: string;
  status: "available" | "sold" | "defective" | "returned" | "in_transit";
  entryDate?: string;
  exitDate?: string;
  lotId?: string;
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
  unitCost: number;
  referenceType: string;
  referenceLocalId: string;
  referenceDocumentType?: string;
  costLayerId?: string;
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
  id?: string; // UUID for normalized store rows
  saleLocalId?: string;
  saleId?: string; // server uuid when available
  productLocalId: string;
  qty: number;
  unitPrice: number;
  unitCost?: number;
  taxAmount?: number;
  discountAmount?: number;
}

export interface SalePaymentRecord {
  id?: string;
  saleLocalId?: string;
  saleId?: string;
  method: "cash" | "card" | "transfer" | "mobile" | "mixed";
  currency: "VES" | "USD";
  amount: number;
  reference?: string;
}

export interface SaleRecord {
  localId: string;
  tenantId: string;
  saleNumber: string;
  warehouseLocalId: string;
  cashierUserId: string;
  salesPersonId: string;
  posTerminalId: string;
  customerId: string;
  status: "draft" | "completed" | "voided" | "refunded";
  currency: "VES" | "USD";
  exchangeRate: number;
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  total: number;
  totalPaid: number;
  changeAmount: number;
  items: SaleItemRecord[];
  payments: SalePaymentRecord[];
  suspendedSourceLocalId: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface SuspendedSaleRecord {
  localId: string;
  tenantId: string;
  warehouseLocalId: string;
  cashierUserId: string;
  status: "open" | "resumed" | "cancelled" | "converted";
  cart: SaleItemRecord[];
  paymentsDraft: SalePaymentRecord[];
  notes: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface BoxClosingRecord {
  localId: string;
  tenantId: string;
  warehouseLocalId: string;
  openedBy: string;
  closedBy: string;
  status: "open" | "closed";
  openedAt: string;
  closedAt: string;
  openingAmount: number;
  expectedAmount: number;
  countedAmount: number;
  differenceAmount: number;
  salesCount: number;
  openingReading: string;
  closingReading: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface SupplierRecord {
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

export interface PurchaseItemRecord {
  id?: string;
  purchaseLocalId?: string;
  purchaseId?: string;
  productLocalId: string;
  qty: number;
  unitCost: number;
}

export interface PurchaseReceivedItemRecord {
  id?: string;
  purchaseLocalId?: string;
  purchaseId?: string;
  productLocalId: string;
  qtyOrdered: number;
  qtyReceived: number;
}

export interface PurchaseRecord {
  localId: string;
  tenantId: string;
  warehouseLocalId: string;
  supplierLocalId?: string;
  supplierName?: string;
  status: "draft" | "confirmed" | "partial_received" | "received" | "cancelled";
  currency: "VES" | "USD";
  exchangeRate: number;
  subtotal: number;
  total: number;
  items: PurchaseItemRecord[];
  receivedItems?: PurchaseReceivedItemRecord[];
  createdBy?: string;
  receivedAt?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface ReceivingItemRecord {
  id?: string;
  receivingLocalId?: string;
  receivingId?: string;
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
  receivedItems?: ReceivingItemRecord[];
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
  id?: string;
  recipeLocalId?: string;
  recipeId?: string;
  productLocalId: string;
  requiredQty: number;
}

export interface ProductionIngredientRecord {
  id?: string;
  productionLogLocalId?: string;
  productionLogId?: string;
  productLocalId: string;
  qtyUsed: number;
  qtyPlanned?: number;
  costPerUnit?: number;
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

export interface InvoiceItemRecord {
  productLocalId: string;
  description: string;
  qty: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  subtotal: number;
  discountPercent?: number;
  discountAmount?: number;
}

export interface InvoicePaymentRecord {
  method: "cash" | "card" | "transfer" | "mobile" | "mixed";
  currency: "VES" | "USD";
  amount: number;
  reference?: string;
}

export interface InvoiceRecord {
  localId: string;
  tenantId: string;
  saleLocalId?: string;
  customerId?: string;
  customerName?: string;
  customerRif?: string;
  invoiceNumber?: string;
  pointOfSale?: string;
  controlNumber?: string;
  status: "draft" | "issued" | "voided";
  currency: "VES" | "USD";
  exchangeRate: number;
  exchangeRateSnapshot?: {
    rate: number;
    capturedAt: string;
    source: string;
  };
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  igtfAmount: number;
  total: number;
  items: InvoiceItemRecord[];
  payments: InvoicePaymentRecord[];
  notes?: string;
  issuedAt?: string;
  voidedAt?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface TaxRuleRecord {
  localId: string;
  tenantId: string;
  name: string;
  rate: number;
  type: "iva" | "islr" | "igtf";
  isWithholding: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface ExchangeRateRecord {
  localId: string;
  tenantId: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  source: string;
  validFrom: string;
  validTo?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface InvoiceRangeRecord {
  localId: string;
  tenantId: string;
  prefix: string;
  startNumber: number;
  endNumber: number;
  currentNumber: number;
  controlNumberPrefix: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface SecurityAuditLogRecord {
  localId: string;
  tenantId: string;
  userId?: string;
  eventType: string;
  targetTable?: string;
  targetLocalId?: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  details?: Record<string, unknown>;
  createdAt: string;
}

export interface SyncMetadataRecord {
  tableName: string;
  tenantId: string;
  lastSyncTimestamp: string;
  lastSyncVersion: number;
  createdAt: string;
  updatedAt: string;
}

// Helper tipo para evitar `any` en migraciones/lecturas dinámicas
type AnyRecord = Record<string, unknown>;

export class LogisCoreDexie extends Dexie {
  bootstrap_state!: EntityTable<CoreBootstrapState, "id">;
  sync_queue!: EntityTable<SyncQueueEntity, "id">;
  sync_errors!: EntityTable<SyncErrorRecord, "id">;
  sync_metadata!: EntityTable<SyncMetadataRecord, "tableName">;
  suppliers!: EntityTable<SupplierRecord, "localId">;
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
  invoices!: EntityTable<InvoiceRecord, "localId">;
  tax_rules!: EntityTable<TaxRuleRecord, "localId">;
  exchange_rates!: EntityTable<ExchangeRateRecord, "localId">;
  invoice_ranges!: EntityTable<InvoiceRangeRecord, "localId">;
  security_audit_log!: EntityTable<SecurityAuditLogRecord, "localId">;
  // Normalized stores for items/payments/ingredients
  sale_items!: EntityTable<SaleItemRecord, "id">;
  sale_payments!: EntityTable<SalePaymentRecord, "id">;
  invoice_items!: EntityTable<InvoiceItemRecord, "id">;
  invoice_payments!: EntityTable<InvoicePaymentRecord, "id">;
  purchase_items!: EntityTable<PurchaseItemRecord, "id">;
  purchase_received_items!: EntityTable<PurchaseReceivedItemRecord, "id">;
  receiving_items!: EntityTable<ReceivingItemRecord, "id">;
  receiving_received_items!: EntityTable<PurchaseReceivedItemRecord, "id">;
  recipe_ingredients!: EntityTable<RecipeIngredientRecord, "id">;
  production_ingredients!: EntityTable<ProductionIngredientRecord, "id">;

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
    this.version(8).stores({
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
        "&localId, tenantId, productionOrderLocalId, recipeLocalId, warehouseLocalId, createdAt",
      invoices:
        "&localId, tenantId, saleLocalId, customerId, status, createdAt",
      tax_rules:
        "&localId, tenantId, type, isActive, createdAt",
      exchange_rates:
        "&localId, tenantId, source, fromCurrency, toCurrency, validFrom, createdAt"
    });
    this.version(9).stores({
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
        "&localId, tenantId, productionOrderLocalId, recipeLocalId, warehouseLocalId, createdAt",
      invoices:
        "&localId, tenantId, saleLocalId, customerId, status, createdAt",
      tax_rules:
        "&localId, tenantId, type, isActive, createdAt",
      exchange_rates:
        "&localId, tenantId, source, fromCurrency, toCurrency, validFrom, createdAt",
      security_audit_log:
        "&localId, tenantId, userId, eventType, createdAt"
    });
    this.version(10).stores({
      bootstrap_state: "&id, tenantId, userId, bootstrappedAt",
      sync_queue: "&id, tenantId, table, operation, createdAt, attempts, status",
      sync_errors: "&id, queueItemId, tenantId, failedAt",
      suppliers: "&localId, tenantId, name, createdAt",
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
        "&localId, tenantId, productionOrderLocalId, recipeLocalId, warehouseLocalId, createdAt",
      invoices:
        "&localId, tenantId, saleLocalId, customerId, status, createdAt",
      tax_rules:
        "&localId, tenantId, type, isActive, createdAt",
      exchange_rates:
        "&localId, tenantId, source, fromCurrency, toCurrency, validFrom, createdAt",
      security_audit_log:
        "&localId, tenantId, userId, eventType, createdAt"
    });
    this.version(11).stores({
      bootstrap_state: "&id, tenantId, userId, bootstrappedAt",
      sync_queue: "&id, tenantId, table, operation, createdAt, attempts, status",
      sync_errors: "&id, queueItemId, tenantId, failedAt",
      suppliers: "&localId, tenantId, name, createdAt",
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
        "&localId, tenantId, productionOrderLocalId, recipeLocalId, warehouseLocalId, createdAt",
      invoices:
        "&localId, tenantId, saleLocalId, customerId, status, createdAt",
      tax_rules:
        "&localId, tenantId, type, isActive, createdAt",
      exchange_rates:
        "&localId, tenantId, source, fromCurrency, toCurrency, validFrom, createdAt",
      security_audit_log:
        "&localId, tenantId, userId, eventType, createdAt"
    });
    this.version(12).stores({
      bootstrap_state: "&id, tenantId, userId, bootstrappedAt",
      sync_queue: "&id, tenantId, table, operation, createdAt, attempts, status",
      sync_errors: "&id, queueItemId, tenantId, failedAt",
      suppliers: "&localId, tenantId, name, createdAt",
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
        "&localId, tenantId, productionOrderLocalId, recipeLocalId, warehouseLocalId, createdAt",
      invoices:
        "&localId, tenantId, saleLocalId, customerId, status, createdAt",
      tax_rules:
        "&localId, tenantId, type, isActive, createdAt",
      exchange_rates:
        "&localId, tenantId, source, fromCurrency, toCurrency, validFrom, createdAt",
      invoice_ranges:
        "&localId, tenantId, isActive, createdAt",
      security_audit_log:
        "&localId, tenantId, userId, eventType, createdAt"
    });
    this.version(13).stores({
      bootstrap_state: "&id, tenantId, userId, bootstrappedAt",
      sync_queue: "&id, tenantId, table, operation, createdAt, attempts, status",
      sync_errors: "&id, queueItemId, tenantId, failedAt",
      sync_metadata: "&tableName, tenantId, lastSyncTimestamp",
      suppliers: "&localId, tenantId, name, createdAt",
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
        "&localId, tenantId, productionOrderLocalId, recipeLocalId, warehouseLocalId, createdAt",
      invoices:
        "&localId, tenantId, saleLocalId, customerId, status, createdAt",
      tax_rules:
        "&localId, tenantId, type, isActive, createdAt",
      exchange_rates:
        "&localId, tenantId, source, fromCurrency, toCurrency, validFrom, createdAt",
      invoice_ranges:
        "&localId, tenantId, isActive, createdAt",
      security_audit_log:
        "&localId, tenantId, userId, eventType, createdAt"
    });
    this.version(14).stores({
      bootstrap_state: "&id, tenantId, userId, bootstrappedAt",
      sync_queue: "&id, tenantId, table, operation, createdAt, attempts, status",
      sync_errors: "&id, queueItemId, tenantId, failedAt",
      sync_metadata: "&tableName, tenantId, lastSyncTimestamp",
      suppliers: "&localId, tenantId, name, createdAt",
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
      sales: "&localId, [tenantId+createdAt], warehouseLocalId, status, createdAt",
      suspended_sales: "&localId, tenantId, warehouseLocalId, status, createdAt",
      box_closings: "&localId, [tenantId+createdAt], warehouseLocalId, status, createdAt",
      purchases: "&localId, [tenantId+createdAt], warehouseLocalId, status, createdAt",
      receivings: "&localId, tenantId, purchaseLocalId, warehouseLocalId, createdAt",
      inventory_lots:
        "&localId, tenantId, productLocalId, warehouseLocalId, sourceType, sourceLocalId, createdAt",
      recipes: "&localId, tenantId, productLocalId, createdAt",
      production_orders: "&localId, tenantId, recipeLocalId, warehouseLocalId, status, createdAt",
      production_logs:
        "&localId, tenantId, productionOrderLocalId, recipeLocalId, warehouseLocalId, createdAt",
      // Stores de normalización añadidas en versión 15
      sale_items: "&id, saleLocalId, saleId, productLocalId, qty, unitPrice",
      sale_payments: "&id, saleLocalId, saleId, method, currency, amount",
      invoice_items: "&id, invoiceLocalId, invoiceId, productLocalId, qty, unitPrice",
      invoice_payments: "&id, invoiceLocalId, invoiceId, method, currency, amount",
      purchase_items: "&id, purchaseLocalId, purchaseId, productLocalId, qty, unitCost",
      purchase_received_items: "&id, purchaseLocalId, purchaseId, productLocalId, qtyReceived",
      receiving_items: "&id, receivingLocalId, receivingId, productLocalId, qty, unitCost",
      receiving_received_items: "&id, receivingLocalId, receivingId, productLocalId, qtyReceived",
      recipe_ingredients: "&id, recipeLocalId, recipeId, productLocalId, requiredQty",
      production_ingredients: "&id, productionLogLocalId, productionLogId, productLocalId, qtyUsed",
      invoices:
        "&localId, [tenantId+createdAt], saleLocalId, customerId, status, createdAt",
      // Deduplicated: normalización de JSONB handled above
      tax_rules:
        "&localId, tenantId, type, isActive, createdAt",
      exchange_rates:
        "&localId, tenantId, source, fromCurrency, toCurrency, validFrom, createdAt",
      invoice_ranges:
        "&localId, tenantId, isActive, createdAt",
      security_audit_log:
        "&localId, tenantId, userId, eventType, createdAt",
      product_attributes: "&localId, tenantId, productLocalId, name, deletedAt",
      product_variants: "&localId, tenantId, productLocalId, skuVariant, isDefault, deletedAt",
      product_serials: "&localId, tenantId, variantLocalId, productLocalId, serialNumber, status, deletedAt"
    });

    // Nueva versión para introducir stores normalizadas
    this.version(15).stores({
      sale_items: "&id, saleLocalId, saleId, productLocalId, qty, unitPrice",
      sale_payments: "&id, saleLocalId, saleId, method, currency, amount",
      invoice_items: "&id, invoiceLocalId, invoiceId, productLocalId, qty, unitPrice",
      invoice_payments: "&id, invoiceLocalId, invoiceId, method, currency, amount",
      purchase_items: "&id, purchaseLocalId, purchaseId, productLocalId, qty, unitCost",
      purchase_received_items: "&id, purchaseLocalId, purchaseId, productLocalId, qtyReceived",
      receiving_items: "&id, receivingLocalId, receivingId, productLocalId, qty, unitCost",
      receiving_received_items: "&id, receivingLocalId, receivingId, productLocalId, qtyReceived",
      recipe_ingredients: "&id, recipeLocalId, recipeId, productLocalId, requiredQty",
      production_ingredients: "&id, productionLogLocalId, productionLogId, productLocalId, qtyUsed"
    });

    // Upgrade migration: move nested arrays (items/payments/ingredients) into normalized stores
    this.version(15).upgrade(async (tx) => {
      const getServerId = (record: AnyRecord): string | undefined => (record as AnyRecord)?.id as string | undefined ?? (record as AnyRecord)?.serverId as string | undefined ?? undefined;

      // Migrate sales -> sale_items, sale_payments
        try {
          const allSales = await tx.table("sales").toArray();
          for (const s of allSales) {
            const ss = s as AnyRecord;
            const saleLocalId = ss.localId as string;
            const saleId = getServerId(ss);
            if (Array.isArray(ss.items)) {
              const items = (ss.items as AnyRecord[]).map((it) => ({
                id: crypto.randomUUID(),
                saleLocalId,
                saleId,
                productLocalId: it.productLocalId as string,
                qty: it.qty as number,
                unitPrice: it.unitPrice as number,
                unitCost: (it.unitCost as number) ?? null,
                taxAmount: (it.taxAmount as number) ?? 0,
                discountAmount: (it.discountAmount as number) ?? 0
              }));
              // tx.table typings are loose in upgrade context; use cast to unknown to satisfy TS
              await (tx.table("sale_items") as unknown as { bulkPut(rows: unknown[]): Promise<void> }).bulkPut(items);
            }

            if (Array.isArray(ss.payments)) {
              const payments = (ss.payments as AnyRecord[]).map((p) => ({
                id: crypto.randomUUID(),
                saleLocalId,
                saleId,
                method: p.method as string,
                currency: p.currency as string,
                amount: p.amount as number,
                reference: (p.reference as string) ?? null
              }));
              await (tx.table("sale_payments") as unknown as { bulkPut(rows: unknown[]): Promise<void> }).bulkPut(payments);
            }
          }
        } catch (err) {
          // Migration should not fail hard; log and continue
          console.error("Dexie migration (sales) failed:", err);
        }

      // Migrate invoices -> invoice_items, invoice_payments
      try {
        const allInvoices = await tx.table("invoices").toArray();
        for (const inv of allInvoices) {
          const invoiceLocalId = inv.localId;
          const invoiceId = getServerId(inv);
          if (Array.isArray(inv.items)) {
            const items = (inv.items as AnyRecord[]).map((it) => ({
              id: crypto.randomUUID(),
              invoiceLocalId,
              invoiceId,
              productLocalId: it.productLocalId as string,
              description: (it.description as string) ?? null,
              qty: it.qty as number,
              unitPrice: it.unitPrice as number,
              taxRate: (it.taxRate as number) ?? 0,
              taxAmount: (it.taxAmount as number) ?? 0,
              subtotal: (it.subtotal as number) ?? 0,
              discountPercent: (it.discountPercent as number) ?? null,
              discountAmount: (it.discountAmount as number) ?? 0
            }));
            await (tx.table("invoice_items") as unknown as { bulkPut(rows: unknown[]): Promise<void> }).bulkPut(items);
          }

          if (Array.isArray(inv.payments)) {
            const payments = (inv.payments as AnyRecord[]).map((p) => ({
              id: crypto.randomUUID(),
              invoiceLocalId,
              invoiceId,
              method: p.method as string,
              currency: p.currency as string,
              amount: p.amount as number,
              reference: (p.reference as string) ?? null
            }));
            await (tx.table("invoice_payments") as unknown as { bulkPut(rows: unknown[]): Promise<void> }).bulkPut(payments);
          }
        }
      } catch (err) {
        console.error("Dexie migration (invoices) failed:", err);
      }

      // Migrate purchases -> purchase_items, purchase_received_items
      try {
        const allPurchases = await tx.table("purchases").toArray();
        for (const pch of allPurchases) {
          const purchaseLocalId = pch.localId;
          const purchaseId = getServerId(pch);
          if (Array.isArray(pch.items)) {
            const items = (pch.items as AnyRecord[]).map((it) => ({
              id: crypto.randomUUID(),
              purchaseLocalId,
              purchaseId,
              productLocalId: it.productLocalId as string,
              qty: it.qty as number,
              unitCost: it.unitCost as number
            }));
            await (tx.table("purchase_items") as unknown as { bulkPut(rows: unknown[]): Promise<void> }).bulkPut(items);
          }

          if (Array.isArray(pch.receivedItems)) {
            const ritems = (pch.receivedItems as AnyRecord[]).map((it) => ({
              id: crypto.randomUUID(),
              purchaseLocalId,
              purchaseId,
              productLocalId: it.productLocalId as string,
              qtyReceived: (it.qtyReceived as number) ?? (it.qtyReceived as number)
            }));
            await (tx.table("purchase_received_items") as unknown as { bulkPut(rows: unknown[]): Promise<void> }).bulkPut(ritems);
          }
        }
       } catch (err) {
         console.error("Dexie migration (purchases) failed:", err);
       }

      // Migrate receivings -> receiving_items, receiving_received_items
      try {
        const allReceivings = await tx.table("receivings").toArray();
        for (const r of allReceivings) {
          const receivingLocalId = r.localId;
          const receivingId = getServerId(r);
          if (Array.isArray(r.items)) {
            const items = (r.items as AnyRecord[]).map((it) => ({
              id: crypto.randomUUID(),
              receivingLocalId,
              receivingId,
              productLocalId: it.productLocalId as string,
              qty: it.qty as number,
              unitCost: it.unitCost as number
            }));
            await (tx.table("receiving_items") as unknown as { bulkPut(rows: unknown[]): Promise<void> }).bulkPut(items);
          }

          if (Array.isArray(r.receivedItems)) {
            const ritems = (r.receivedItems as AnyRecord[]).map((it) => ({
              id: crypto.randomUUID(),
              receivingLocalId,
              receivingId,
              productLocalId: it.productLocalId as string,
              qtyReceived: (it.qtyReceived as number) ?? (it.qtyReceived as number)
            }));
            await (tx.table("receiving_received_items") as unknown as { bulkPut(rows: unknown[]): Promise<void> }).bulkPut(ritems);
          }
        }
       } catch (err) {
         console.error("Dexie migration (receivings) failed:", err);
       }

      // Migrate recipes -> recipe_ingredients
      try {
        const allRecipes = await tx.table("recipes").toArray();
        for (const rc of allRecipes) {
          const recipeLocalId = rc.localId;
          const recipeId = getServerId(rc);
          if (Array.isArray(rc.ingredients)) {
            const ingr = (rc.ingredients as AnyRecord[]).map((it) => ({
              id: crypto.randomUUID(),
              recipeLocalId,
              recipeId,
              productLocalId: (it.productLocalId as string) ?? "",
              requiredQty: (it.requiredQty as number) ?? 0
            }));
            // use a safe cast for bulkPut in upgrade transaction
            await (tx.table("recipe_ingredients") as unknown as { bulkPut(rows: unknown[]): Promise<void> }).bulkPut(ingr);
          }
        }
       } catch (err) {
         console.error("Dexie migration (recipes) failed:", err);
       }

      // Migrate production_logs -> production_ingredients
      try {
        const allLogs = await tx.table("production_logs").toArray();
        for (const pl of allLogs) {
          const productionLogLocalId = pl.localId;
          const productionLogId = getServerId(pl);
          if (Array.isArray(pl.ingredientsUsed)) {
            const ingr = (pl.ingredientsUsed as AnyRecord[]).map((it) => ({
              id: crypto.randomUUID(),
              productionLogLocalId,
              productionLogId,
              productLocalId: (it.productLocalId as string) ?? "",
              qtyUsed: (it.requiredQty as number) ?? (it.qtyUsed as number) ?? 0
            }));
            await (tx.table("production_ingredients") as unknown as { bulkPut(rows: unknown[]): Promise<void> }).bulkPut(ingr);
          }
        }
    } catch (err) {
      console.error("Dexie migration (production_logs) failed:", err);
    }
  });

    // Versión 16: Incremento de versión para resolver warning de schema extendido
    this.version(16).stores({});
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

export class DexieCatalogsDbAdapter {
  constructor(private readonly db: LogisCoreDexie) {}

  async bulkPut(
    table: "categories" | "products" | "product_presentations" | "product_size_colors" | "warehouses" | "product_attributes" | "product_variants" | "product_serials",
    records: CatalogRecord[]
  ): Promise<void> {
    switch (table) {
      case "categories":
        await this.db.categories.bulkPut(records as CategoryRecord[]);
        break;
      case "products":
        await this.db.products.bulkPut(records as ProductRecord[]);
        break;
      case "product_presentations":
        await this.db.product_presentations.bulkPut(records as ProductPresentationRecord[]);
        break;
      case "product_size_colors":
        await this.db.product_size_colors.bulkPut(records as ProductSizeColorRecord[]);
        break;
      case "warehouses":
        await this.db.warehouses.bulkPut(records as WarehouseRecord[]);
        break;
      case "product_attributes":
        await this.db.product_attributes.bulkPut(records as ProductAttributeRecord[]);
        break;
      case "product_variants":
        await this.db.product_variants.bulkPut(records as ProductVariantRecord[]);
        break;
      case "product_serials":
        await this.db.product_serials.bulkPut(records as ProductSerialRecord[]);
        break;
    }
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
