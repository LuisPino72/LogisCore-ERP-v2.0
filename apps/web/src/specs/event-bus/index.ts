import { z } from "zod";
import { err, ok, type Result } from "@logiscore/core";
import type { AppError } from "@logiscore/core";
import { createAppError } from "@logiscore/core";
import { EventBusErrors } from "./errors";

export { EventBusErrors };

const _baseEventPayloadSchema = z.object({
  tenantId: z.string().min(1),
  timestamp: z.string().datetime(),
  correlationId: z.string().uuid().optional()
});

const productEventsSchema = z.object({
  productLocalId: z.string().uuid(),
  productName: z.string().min(1),
  sku: z.string().optional(),
  isWeighted: z.boolean().optional(),
  categoryId: z.string().uuid().optional()
});

const saleEventsSchema = z.object({
  saleLocalId: z.string().uuid(),
  saleNumber: z.string(),
  total: z.number().min(0),
  currency: z.enum(["VES", "USD"]),
  warehouseLocalId: z.string().uuid().optional(),
  cashierUserId: z.string().optional(),
  customerId: z.string().optional(),
  igtfAmount: z.number().min(0).optional(),
  itemsCount: z.number().int().min(1).optional()
});

const posEventsSchema = z.object({
  boxLocalId: z.string().uuid(),
  warehouseLocalId: z.string().uuid(),
  openedBy: z.string().optional(),
  openingAmount: z.number().min(0).optional(),
  status: z.enum(["open", "closed"])
});

const inventoryEventsSchema = z.object({
  warehouseLocalId: z.string().uuid(),
  productLocalId: z.string().uuid(),
  quantity: z.number(),
  unitCost: z.number().min(0).optional(),
  movementType: z.enum([
    "purchase_in",
    "sale_out",
    "adjustment_in",
    "adjustment_out",
    "production_in",
    "production_out",
    "transfer_in",
    "transfer_out",
    "count_adjustment"
  ]),
  lotLocalId: z.string().uuid().optional()
});

const purchasesEventsSchema = z.object({
  purchaseLocalId: z.string().uuid(),
  supplierLocalId: z.string().uuid().optional(),
  supplierName: z.string().min(1),
  total: z.number().min(0),
  status: z.enum(["draft", "confirmed", "partial_received", "received", "cancelled"]),
  itemsCount: z.number().int().min(1).optional()
});

const productionEventsSchema = z.object({
  orderLocalId: z.string().uuid(),
  recipeLocalId: z.string().uuid(),
  productLocalId: z.string().uuid().optional(),
  plannedQty: z.number().min(0).optional(),
  producedQty: z.number().min(0).optional(),
  status: z.enum(["draft", "in_progress", "completed", "cancelled"]),
  variancePercent: z.number().optional()
});

const invoiceEventsSchema = z.object({
  invoiceLocalId: z.string().uuid(),
  invoiceNumber: z.string(),
  controlNumber: z.string().optional(),
  customerRif: z.string().regex(/^[VJEGP]\d{9}$/).optional(),
  customerName: z.string().min(1).optional(),
  total: z.number().min(0),
  igtfAmount: z.number().min(0).optional(),
  exchangeRateSnapshot: z.object({
    rate: z.number().min(0),
    capturedAt: z.string().datetime(),
    source: z.string()
  }).optional(),
  status: z.enum(["draft", "issued", "voided"])
});

const adminEventsSchema = z.object({
  tenantId: z.string(),
  tenantName: z.string().min(1),
  rif: z.string().regex(/^[VJEGP]\d{9}$/).optional(),
  subscriptionStatus: z.enum(["active", "suspended", "expired", "trial"]).optional(),
  userId: z.string().uuid().optional(),
  userEmail: z.string().email().optional()
});

const authEventsSchema = z.object({
  userId: z.string().uuid(),
  tenantSlug: z.string(),
  role: z.string().optional(),
  scope: z.array(z.string()).optional()
});

const syncEventsSchema = z.object({
  tableName: z.string(),
  localId: z.string().uuid(),
  conflictType: z.enum(["LWW", "SUM_MERGE", "MANUAL", "DLQ"]).optional(),
  resolution: z.string().optional()
});

const coreEventsSchema = z.object({
  phase: z.string(),
  catalogsLoaded: z.array(z.string()).optional(),
  error: z.string().optional()
});

type EventCategory = "PRODUCT" | "SALE" | "POS" | "INVENTORY" | "PURCHASES" | "PRODUCTION" | "INVOICE" | "ADMIN" | "AUTH" | "SYNC" | "CORE";

const eventCategoryMap: Record<string, EventCategory> = {
  "PRODUCT.CREATED": "PRODUCT",
  "PRODUCT.UPDATED": "PRODUCT",
  "PRODUCT.DELETED": "PRODUCT",
  "SALE.COMPLETED": "SALE",
  "SALE.VOIDED": "SALE",
  "SALE.SUSPENDED": "SALE",
  "SALE.SUSPENDED_RESTORED": "SALE",
  "POS.BOX_OPENED": "POS",
  "POS.BOX_CLOSED": "POS",
  "INVENTORY.WAREHOUSE_CREATED": "INVENTORY",
  "INVENTORY.STOCK_MOVEMENT_RECORDED": "INVENTORY",
  "INVENTORY.COUNT_CREATED": "INVENTORY",
  "INVENTORY.COUNT_POSTED": "INVENTORY",
  "PURCHASES.CREATED": "PURCHASES",
  "PURCHASES.RECEIVED": "PURCHASES",
  "PURCHASES.CONFIRMED": "PURCHASES",
  "PURCHASES.CANCELLED": "PURCHASES",
  "PRODUCTION.ORDER_CREATED": "PRODUCTION",
  "PRODUCTION.STARTED": "PRODUCTION",
  "PRODUCTION.COMPLETED": "PRODUCTION",
  "INVOICE.CREATED": "INVOICE",
  "INVOICE.ISSUED": "INVOICE",
  "INVOICE.VOIDED": "INVOICE",
  "ADMIN.TENANT_CREATED": "ADMIN",
  "ADMIN.TENANT_UPDATED": "ADMIN",
  "ADMIN.USER_STATUS_TOGGLED": "ADMIN",
  "AUTH.SESSION_RESOLVED": "AUTH",
  "AUTH.SIGNIN_SUCCESS": "AUTH",
  "AUTH.SIGNIN_FAILED": "AUTH",
  "SYNC.CONFLICT_DETECTED": "SYNC",
  "CORE.BOOTSTRAP_STARTED": "CORE",
  "CORE.BOOTSTRAP_COMPLETED": "CORE",
  "CORE.BOOTSTRAP_FAILED": "CORE",
  "DASHBOARD.READY": "CORE"
};

const getSchemaForCategory = (category: EventCategory) => {
  switch (category) {
    case "PRODUCT": return productEventsSchema;
    case "SALE": return saleEventsSchema;
    case "POS": return posEventsSchema;
    case "INVENTORY": return inventoryEventsSchema;
    case "PURCHASES": return purchasesEventsSchema;
    case "PRODUCTION": return productionEventsSchema;
    case "INVOICE": return invoiceEventsSchema;
    case "ADMIN": return adminEventsSchema;
    case "AUTH": return authEventsSchema;
    case "SYNC": return syncEventsSchema;
    case "CORE": return coreEventsSchema;
  }
};

export const validateEventPayload = (
  eventName: string,
  payload: unknown
): Result<unknown, AppError> => {
  const eventPattern = /^[A-Z]+\.[A-Z_]+$/;
  if (!eventPattern.test(eventName)) {
    return err(EventBusErrors.INVALID_EVENT_NAME);
  }

  const category = eventCategoryMap[eventName];
  if (!category) {
    return ok(payload);
  }

  const categorySchema = getSchemaForCategory(category);
  const result = categorySchema.safeParse(payload);

  if (!result.success) {
    return err(createAppError({
      code: "EVENTBUS_PAYLOAD_VALIDATION_FAILED",
      message: `Payload inválido para evento ${eventName}: ${result.error.message}`,
      retryable: false,
      context: { eventName, errors: result.error.errors }
    }));
  }

  return ok(result.data);
};

export const validateEventName = (eventName: string): boolean => {
  const eventPattern = /^[A-Z]+\.[A-Z_]+$/;
  return eventPattern.test(eventName);
};

export const extractEventCategory = (eventName: string): EventCategory | null => {
  return eventCategoryMap[eventName] || null;
};

export const EVENT_BUS_VALIDATORS = {
  validateEventPayload,
  validateEventName,
  extractEventCategory
} as const;

export type { EventCategory };