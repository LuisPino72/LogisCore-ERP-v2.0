import {
  createAppError,
  err,
  ok,
  type AppError,
  type EventBus,
  type Result,
  type SyncEngine
} from "@logiscore/core";
import { hasPermission } from "@/features/tenant/types/tenant.types";
import type { StockMovementRecord } from "@/lib/db/dexie";
import type { InventoryLot } from "@/features/inventory/types/inventory.types";
import type {
  BoxClosing,
  CloseBoxInput,
  CreatePosSaleInput,
  CreateSuspendedSaleInput,
  OpenBoxInput,
  RestoreSuspendedSaleResult,
  Sale,
  SalesActorContext,
  SalesCurrency,
  SalesTenantContext,
  SuspendedSale
} from "../types/sales.types";
import {
  validateTenantForDexie,
  validatePaymentSufficient,
  validateQuantityPrecision,
  validateExchangeRateSnapshot,
} from "../../../specs/sales";
import { applyCentsRule, needsCentsAdjustment, computeIgtf } from "../../invoicing/utils/fiscal";

/**
 * Interfaz para acceder a funciones RPC de Supabase.
 */
export interface SalesSupabaseLike {
  rpc: <T>(fn: string, args?: Record<string, unknown>) => Promise<{
    data: T | null;
    error: { message: string } | null;
  }>;
}

interface RpcRow {
  success: boolean;
  code: string;
  message: string;
  sale_local_id?: string;
  suspended_local_id?: string;
  box_closing_local_id?: string;
  expected_amount?: number;
  difference_amount?: number;
  opening_amount?: number;
  opened_at?: string;
  closed_at?: string;
  sales_count?: number;
}

/**
 * Interfaz del adaptador de base de datos para ventas.
 * Define las operaciones CRUD básicas sobre ventas, ventas suspendidas y cajas.
 */
export interface SalesDb {
  createSale(sale: Sale): Promise<void>;
  listSales(tenantId: string): Promise<Sale[]>;
  createSuspendedSale(sale: SuspendedSale): Promise<void>;
  listSuspendedSales(tenantId: string): Promise<SuspendedSale[]>;
  markSuspendedSaleConverted(
    tenantId: string,
    localId: string,
    updatedAt: string
  ): Promise<void>;
  getSuspendedSaleByLocalId(
    tenantId: string,
    localId: string
  ): Promise<SuspendedSale | undefined>;
  createBoxClosing(box: BoxClosing): Promise<void>;
  getOpenBoxByWarehouse(
    tenantId: string,
    warehouseLocalId: string
  ): Promise<BoxClosing | undefined>;
  closeOpenBoxByWarehouse(
    tenantId: string,
    warehouseLocalId: string,
    closeData: Pick<
      BoxClosing,
      "closedAt" | "closedBy" | "status" | "expectedAmount" | "countedAmount" | "differenceAmount" | "salesCount" | "updatedAt" | "metadata"
    >
  ): Promise<void>;
  listBoxClosings(tenantId: string): Promise<BoxClosing[]>;
  createStockMovements(movements: StockMovementRecord[]): Promise<void>;
  listInventoryLots(tenantId: string): Promise<InventoryLot[]>;
  updateInventoryLot(lot: InventoryLot): Promise<void>;
}

/**
 * Interfaz del servicio de ventas.
 * Define todas las operaciones de negocio relacionadas con ventas POS.
 * Todas las funciones retornan Result<T, AppError> para manejo de errores.
 */
export interface SalesService {
  createSuspendedSale(
    tenant: SalesTenantContext,
    actor: SalesActorContext,
    input: CreateSuspendedSaleInput
  ): Promise<Result<SuspendedSale, AppError>>;
  createPosSale(
    tenant: SalesTenantContext,
    actor: SalesActorContext,
    input: CreatePosSaleInput
  ): Promise<Result<Sale, AppError>>;
  restoreSuspendedSale(
    tenant: SalesTenantContext,
    actor: SalesActorContext,
    suspendedLocalId: string
  ): Promise<Result<RestoreSuspendedSaleResult, AppError>>;
  openBox(
    tenant: SalesTenantContext,
    actor: SalesActorContext,
    input: OpenBoxInput
  ): Promise<Result<BoxClosing, AppError>>;
  closeBox(
    tenant: SalesTenantContext,
    actor: SalesActorContext,
    input: CloseBoxInput
  ): Promise<Result<BoxClosing, AppError>>;
  listSales(tenant: SalesTenantContext): Promise<Result<Sale[], AppError>>;
  listSuspendedSales(
    tenant: SalesTenantContext
  ): Promise<Result<SuspendedSale[], AppError>>;
  listBoxClosings(
    tenant: SalesTenantContext
  ): Promise<Result<BoxClosing[], AppError>>;
}

interface SalesServiceDependencies {
  db: SalesDb;
  syncEngine: SyncEngine;
  eventBus: EventBus;
  supabase: SalesSupabaseLike;
  clock?: () => Date;
  uuid?: () => string;
}

export const createSalesService = ({
  db,
  syncEngine,
  eventBus,
  supabase,
  clock = () => new Date(),
  uuid = () => crypto.randomUUID()
}: SalesServiceDependencies): SalesService => {
  const roundMoney = (value: number): number =>
    Math.round((value + Number.EPSILON) * 10000) / 10000;

  const convertToSaleCurrency = (
    amount: number,
    paymentCurrency: SalesCurrency,
    saleCurrency: SalesCurrency,
    exchangeRate: number
  ): number => {
    if (saleCurrency === paymentCurrency) {
      return roundMoney(amount);
    }
    if (exchangeRate <= 0) {
      return NaN;
    }
    if (saleCurrency === "VES" && paymentCurrency === "USD") {
      return roundMoney(amount * exchangeRate);
    }
    if (saleCurrency === "USD" && paymentCurrency === "VES") {
      return roundMoney(amount / exchangeRate);
    }
    return NaN;
  };

  const consumeFifoStock = async (
    tenantId: string,
    productLocalId: string,
    warehouseLocalId: string,
    quantityToConsume: number,
    saleLocalId: string,
    actorUserId: string,
    now: string
  ): Promise<Result<{ movements: StockMovementRecord[]; totalCost: number }, AppError>> => {
    const allLots = await db.listInventoryLots(tenantId);
    const activeLots = allLots
      .filter(lot => 
        lot.productLocalId === productLocalId && 
        lot.warehouseLocalId === warehouseLocalId && 
        lot.status === "active"
      )
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    let remaining = quantityToConsume;
    const movements: StockMovementRecord[] = [];
    let totalCost = 0;

    for (const lot of activeLots) {
      if (remaining <= 0) break;

      const lotQty = Number(lot.quantity);
      const lotCost = Number(lot.unitCost);
      const consumeFromLot = Math.min(remaining, lotQty);

      movements.push({
        localId: uuid(),
        tenantId,
        productLocalId,
        warehouseLocalId,
        movementType: "sale_out",
        quantity: consumeFromLot,
        unitCost: lotCost,
        costLayerId: lot.localId,
        referenceType: "sale",
        referenceLocalId: saleLocalId,
        notes: "Salida por venta POS (FIFO)",
        createdBy: actorUserId,
        createdAt: now
      });

      totalCost += consumeFromLot * lotCost;
      remaining -= consumeFromLot;

      const newLotQty = lotQty - consumeFromLot;
      await db.updateInventoryLot({
        ...lot,
        quantity: newLotQty,
        status: newLotQty <= 0 ? "consumed" : "active"
      });
    }

    if (remaining > 0) {
      return err(
        createAppError({
          code: "SALE_ITEM_STOCK_INSUFFICIENT",
          message: `Stock insuficiente para el producto ${productLocalId}. Faltan ${remaining} unidades.`,
          retryable: false
        })
      );
    }

    return ok({ movements, totalCost });
  };

  const computeTotalsFromPayments = (
    input: CreatePosSaleInput
  ): Result<{ totalPaid: number; changeAmount: number }, AppError> => {
    if (input.exchangeRate <= 0) {
      return err(
        createAppError({
          code: "EXCHANGE_RATE_INVALID",
          message: "La tasa de cambio debe ser mayor a cero.",
          retryable: false,
          context: { exchangeRate: input.exchangeRate }
        })
      );
    }
    if (!input.payments.length) {
      return err(
        createAppError({
          code: "PAYMENT_REQUIRED",
          message: "La venta requiere al menos un pago.",
          retryable: false
        })
      );
    }

    let totalPaid = 0;
    for (const payment of input.payments) {
      if (payment.amount <= 0) {
        return err(
          createAppError({
            code: "PAYMENT_AMOUNT_INVALID",
            message: "Todos los pagos deben ser mayores a cero.",
            retryable: false
          })
        );
      }
      const converted = convertToSaleCurrency(
        payment.amount,
        payment.currency,
        input.currency,
        input.exchangeRate
      );
      if (Number.isNaN(converted)) {
        return err(
          createAppError({
            code: "PAYMENT_CURRENCY_INVALID",
            message: "No se pudo convertir la moneda del pago.",
            retryable: false,
            context: {
              paymentCurrency: payment.currency,
              saleCurrency: input.currency
            }
          })
        );
      }
      totalPaid = roundMoney(totalPaid + converted);
    }

    if (totalPaid + 0.0001 < input.total) {
      return err(
        createAppError({
          code: "PAYMENT_INSUFFICIENT",
          message: "El total pagado es insuficiente para completar la venta.",
          retryable: false,
          context: { totalPaid, total: input.total }
        })
      );
    }

    return ok({
      totalPaid,
      changeAmount: roundMoney(Math.max(0, totalPaid - input.total))
    });
  };

  const assertWarehouseAccess = (
    actor: SalesActorContext,
    warehouseLocalId: string
  ): Result<void, AppError> => {
    if (actor.role === "owner" || actor.role === "admin") {
      return ok<void>(undefined);
    }
    const allowed = actor.permissions.allowedWarehouseLocalIds;
    if (!allowed?.includes(warehouseLocalId)) {
      return err(
        createAppError({
          code: "WAREHOUSE_ACCESS_DENIED",
          message: "El usuario no tiene acceso a la bodega seleccionada.",
          retryable: false,
          context: { warehouseLocalId }
        })
      );
    }
    return ok<void>(undefined);
  };

  const createSuspendedSale: SalesService["createSuspendedSale"] = async (
    tenant,
    actor,
    input
  ) => {
    if (!input.cart.length) {
      return err(
        createAppError({
          code: "SALE_ITEMS_REQUIRED",
          message: "No se puede suspender una venta sin items.",
          retryable: false
        })
      );
    }
    const warehouseAccess = assertWarehouseAccess(actor, input.warehouseLocalId);
    if (!warehouseAccess.ok) {
      return err(warehouseAccess.error);
    }

    const now = clock().toISOString();
    const localId = uuid();
    const rpc = await supabase.rpc<RpcRow[]>("create_suspended_sale", {
      p_local_id: localId,
      p_warehouse_local_id: input.warehouseLocalId,
      p_cart: input.cart,
      p_payments_draft: input.paymentsDraft ?? [],
      p_notes: input.notes ?? null,
      p_expires_at: input.expiresAt ?? null
    });
    if (rpc.error) {
      return err(
        createAppError({
          code: "SUSPENDED_SALE_RPC_FAILED",
          message: rpc.error.message,
          retryable: true
        })
      );
    }
    const rpcRow = Array.isArray(rpc.data) ? rpc.data[0] : null;
    if (!rpcRow?.success) {
      return err(
        createAppError({
          code: rpcRow?.code ?? "SUSPENDED_SALE_REJECTED",
          message: rpcRow?.message ?? "No se pudo guardar venta suspendida.",
          retryable: false
        })
      );
    }

    const sale: SuspendedSale = {
      localId,
      tenantId: tenant.tenantSlug,
      warehouseLocalId: input.warehouseLocalId,
      cashierUserId: actor.userId || "",
      status: "open",
      cart: input.cart,
      paymentsDraft: input.paymentsDraft ?? [],
      notes: input.notes || "",
      expiresAt: input.expiresAt || "",
      createdAt: now,
      updatedAt: now
    };

    await db.createSuspendedSale(sale);
    eventBus.emit("SALE.SUSPENDED", {
      tenantId: tenant.tenantSlug,
      localId: sale.localId
    });
    return ok(sale);
  };

  const createPosSale: SalesService["createPosSale"] = async (
    tenant,
    actor,
    input
  ) => {
    const tenantValidation = validateTenantForDexie(tenant.tenantSlug);
    if (!tenantValidation.ok) {
      return err(tenantValidation.error);
    }

    const exchangeRateSnapshot = {
      rate: input.exchangeRate,
      capturedAt: new Date().toISOString(),
      source: "bcv" as const,
    };
    const snapshotValidation = validateExchangeRateSnapshot(exchangeRateSnapshot);
    if (!snapshotValidation.ok) {
      return err(snapshotValidation.error);
    }

    if (!input.items.length) {
      return err(
        createAppError({
          code: "SALE_ITEMS_REQUIRED",
          message: "La venta requiere al menos una linea.",
          retryable: false
        })
      );
    }

    for (const item of input.items) {
      const qtyValidation = validateQuantityPrecision(
        item.qty,
        item.isWeighted ?? false
      );
      if (!qtyValidation.ok) {
        return err(qtyValidation.error);
      }
    }
    const warehouseAccess = assertWarehouseAccess(actor, input.warehouseLocalId);
    if (!warehouseAccess.ok) {
      return err(warehouseAccess.error);
    }
    if (input.discountTotal > 0) {
      const canDiscount = hasPermission(actor.permissions, "SALES:DISCOUNT", actor.role);
      if (!canDiscount) {
        return err(
          createAppError({
            code: "ADMIN_PERMISSION_DENIED",
            message: "No tiene permiso para aplicar descuentos.",
            retryable: false,
            context: { required: "SALES:DISCOUNT" }
          })
        );
      }
      const maxAllowed = actor.permissions.maxDiscountPercent;
      const discountPct = input.subtotal > 0 ? (input.discountTotal / input.subtotal) * 100 : 0;
      if (discountPct > maxAllowed) {
        return err(
          createAppError({
            code: "DISCOUNT_LIMIT_EXCEEDED",
            message: "El descuento excede el maximo permitido para el usuario.",
            retryable: false,
            context: { maxAllowed, discountPct }
          })
        );
      }
    }
    const paymentTotals = computeTotalsFromPayments(input);
    if (!paymentTotals.ok) {
      return err(paymentTotals.error);
    }

    const igtfAmount = computeIgtf(
      input.payments,
      0.03,
      input.exchangeRate
    );
    input.igtfAmount = igtfAmount;

    const hasWeightedItems = input.items.some(item => item.isWeighted ?? false);
    const precision = hasWeightedItems ? 4 : 2;

    const roundValue = (val: number): number => {
      const factor = Math.pow(10, precision);
      return Math.round((val + Number.EPSILON) * factor) / factor;
    };

    const adjustedSubtotal = roundValue(input.subtotal);
    const adjustedTaxTotal = roundValue(input.taxTotal);
    const adjustedDiscountTotal = roundValue(input.discountTotal);
    const adjustedIgtf = roundValue(igtfAmount);
    input.total = roundValue(adjustedSubtotal + adjustedTaxTotal - adjustedDiscountTotal + adjustedIgtf);

    if (needsCentsAdjustment(input.total)) {
      input.total = applyCentsRule(input.total);
    }

    const paymentValidation = validatePaymentSufficient(
      paymentTotals.data.totalPaid,
      input.total
    );
    if (!paymentValidation.ok) {
      return err(paymentValidation.error);
    }

    const now = clock().toISOString();
    const localId = uuid();
    const rpc = await supabase.rpc<RpcRow[]>("create_pos_sale", {
      p_local_id: localId,
      p_sale_number: input.saleNumber ?? null,
      p_warehouse_local_id: input.warehouseLocalId,
      p_currency: input.currency,
      p_exchange_rate: input.exchangeRate,
      p_subtotal: input.subtotal,
      p_tax_total: input.taxTotal,
      p_discount_total: input.discountTotal,
      p_igtf_amount: input.igtfAmount,
      p_total: input.total,
      p_total_paid: paymentTotals.data.totalPaid,
      p_change_amount: paymentTotals.data.changeAmount,
      p_items: input.items,
      p_payments: input.payments,
      p_notes: input.notes ?? null,
      p_suspended_source_local_id: input.suspendedSourceLocalId ?? null
    });
    if (rpc.error) {
      return err(
        createAppError({
          code: "SALE_RPC_FAILED",
          message: rpc.error.message,
          retryable: true
        })
      );
    }
    const rpcRow = Array.isArray(rpc.data) ? rpc.data[0] : null;
    if (!rpcRow?.success) {
      return err(
        createAppError({
          code: rpcRow?.code ?? "SALE_REJECTED",
          message: rpcRow?.message ?? "No se pudo completar la venta POS.",
          retryable: false
        })
      );
    }

    const sale: Sale = {
      localId,
      tenantId: tenant.tenantSlug,
      saleNumber: input.saleNumber || "",
      warehouseLocalId: input.warehouseLocalId,
      cashierUserId: actor.userId || "",
      status: "completed",
      currency: input.currency,
      exchangeRate: input.exchangeRate,
      subtotal: input.subtotal,
      taxTotal: input.taxTotal,
      discountTotal: input.discountTotal,
      igtfAmount: input.igtfAmount,
      total: input.total,
      totalPaid: paymentTotals.data.totalPaid,
      changeAmount: paymentTotals.data.changeAmount,
      items: input.items,
      payments: input.payments,
      suspendedSourceLocalId: input.suspendedSourceLocalId || "",
      notes: input.notes || "",
      salesPersonId: input.salesPersonId || "",
      posTerminalId: input.posTerminalId || "",
      customerId: input.customerId || "",
      createdAt: now,
      updatedAt: now
    };


    await db.createSale(sale);
    
    const allStockMovements: StockMovementRecord[] = [];
    for (const item of input.items) {
      const fifoResult = await consumeFifoStock(
        tenant.tenantSlug,
        item.productLocalId,
        input.warehouseLocalId,
        item.qty,
        localId,
        actor.userId || "",
        now
      );
      if (!fifoResult.ok) return fifoResult;
      allStockMovements.push(...fifoResult.data.movements);
    }

    if (allStockMovements.length) {
      await db.createStockMovements(allStockMovements);
      for (const movement of allStockMovements) {
        eventBus.emit("INVENTORY.STOCK_MOVEMENT_RECORDED", {
          tenantId: tenant.tenantSlug,
          localId: movement.localId,
          productLocalId: movement.productLocalId,
          warehouseLocalId: movement.warehouseLocalId
        });
      }
    }
    if (input.suspendedSourceLocalId) {
      await db.markSuspendedSaleConverted(
        tenant.tenantSlug,
        input.suspendedSourceLocalId,
        now
      );
    }

    const queueResult = await syncEngine.enqueue({
      id: uuid(),
      table: "security_audit_log",
      operation: "create",
      payload: {
        eventType: "SALE_COMPLETED",
        userId: actor.userId,
        tenantId: tenant.tenantSlug,
        success: true
      },
      localId: uuid(),
      tenantId: tenant.tenantSlug,
      createdAt: now,
      attempts: 0
    });
    if (!queueResult.ok) {
      return err(queueResult.error);
    }

    eventBus.emit("SALE.COMPLETED", {
      tenantId: tenant.tenantSlug,
      localId: sale.localId,
      total: sale.total
    });
    return ok(sale);
  };

  const restoreSuspendedSale: SalesService["restoreSuspendedSale"] = async (
    tenant,
    actor,
    suspendedLocalId
  ) => {
    const suspendedSale = await db.getSuspendedSaleByLocalId(
      tenant.tenantSlug,
      suspendedLocalId
    );
    if (!suspendedSale || suspendedSale.deletedAt) {
      return err(
        createAppError({
          code: "SUSPENDED_SALE_NOT_FOUND",
          message: "La venta suspendida no existe para este tenant.",
          retryable: false,
          context: { suspendedLocalId }
        })
      );
    }
    if (suspendedSale.status !== "open" && suspendedSale.status !== "resumed") {
      return err(
        createAppError({
          code: "SUSPENDED_SALE_NOT_RESTORABLE",
          message: "La venta suspendida no esta disponible para restaurar.",
          retryable: false,
          context: { suspendedLocalId, status: suspendedSale.status }
        })
      );
    }
    const warehouseAccess = assertWarehouseAccess(actor, suspendedSale.warehouseLocalId);
    if (!warehouseAccess.ok) {
      return err(warehouseAccess.error);
    }

    const restored: RestoreSuspendedSaleResult = {
      sourceLocalId: suspendedSale.localId,
      warehouseLocalId: suspendedSale.warehouseLocalId,
      cart: suspendedSale.cart,
      paymentsDraft: suspendedSale.paymentsDraft,
      notes: suspendedSale.notes
    };
    eventBus.emit("SALE.SUSPENDED_RESTORED", {
      tenantId: tenant.tenantSlug,
      sourceLocalId: suspendedSale.localId,
      warehouseLocalId: suspendedSale.warehouseLocalId
    });
    return ok(restored);
  };

  const closeBox: SalesService["closeBox"] = async (tenant, actor, input) => {
    const canManageBox = hasPermission(actor.permissions, "SALES:POS", actor.role);
    if (!canManageBox) {
      return err(
        createAppError({
          code: "ADMIN_PERMISSION_DENIED",
          message: "No tiene permiso para cerrar caja.",
          retryable: false,
          context: { required: "SALES:POS" }
        })
      );
    }
    const warehouseAccess = assertWarehouseAccess(actor, input.warehouseLocalId);
    if (!warehouseAccess.ok) {
      return err(warehouseAccess.error);
    }

    const openBox = await db.getOpenBoxByWarehouse(
      tenant.tenantSlug,
      input.warehouseLocalId
    );
    if (!openBox) {
      return err(
        createAppError({
          code: "BOX_NOT_OPEN",
          message: "No existe una caja abierta para cerrar en esta bodega.",
          retryable: false,
          context: { warehouseLocalId: input.warehouseLocalId }
        })
      );
    }

    const localId = openBox.localId;
    const rpc = await supabase.rpc<RpcRow[]>("close_open_box_closing", {
      p_local_id: localId,
      p_warehouse_local_id: input.warehouseLocalId,
      p_counted_amount: input.countedAmount,
      p_notes: input.notes ?? null
    });
    if (rpc.error) {
      return err(
        createAppError({
          code: "BOX_CLOSING_RPC_FAILED",
          message: rpc.error.message,
          retryable: true
        })
      );
    }
    const rpcRow = Array.isArray(rpc.data) ? rpc.data[0] : null;
    if (!rpcRow?.success) {
      return err(
        createAppError({
          code: rpcRow?.code ?? "BOX_CLOSING_REJECTED",
          message: rpcRow?.message ?? "No se pudo cerrar caja.",
          retryable: false
        })
      );
    }

    const now = clock().toISOString();
    const box: BoxClosing = {
      localId,
      tenantId: tenant.tenantSlug,
      warehouseLocalId: input.warehouseLocalId,
      openedBy: openBox.openedBy,
      closedBy: actor.userId || "",
      status: "closed",
      openedAt: openBox.openedAt,
      closedAt: now,
      openingAmount: rpcRow.opening_amount ?? openBox.openingAmount,
      expectedAmount: rpcRow.expected_amount ?? 0,
      countedAmount: input.countedAmount,
      differenceAmount: rpcRow.difference_amount ?? 0,
      salesCount: rpcRow.sales_count ?? 0,
      openingReading: "",
      closingReading: "",
      metadata: input.notes ? { notes: input.notes } : {},
      createdAt: openBox.createdAt,
      updatedAt: now
    };
    await db.closeOpenBoxByWarehouse(tenant.tenantSlug, input.warehouseLocalId, {
      status: "closed",
      closedAt: now,
      closedBy: actor.userId || "",
      expectedAmount: box.expectedAmount,
      countedAmount: box.countedAmount,
      differenceAmount: box.differenceAmount,
      salesCount: box.salesCount,
      updatedAt: now,
      metadata: box.metadata
    });
    eventBus.emit("POS.BOX_CLOSED", {
      tenantId: tenant.tenantSlug,
      localId: box.localId
    });
    return ok(box);
  };

  const openBox: SalesService["openBox"] = async (tenant, actor, input) => {
    const canManageBox = hasPermission(actor.permissions, "SALES:POS", actor.role);
    if (!canManageBox) {
      return err(
        createAppError({
          code: "ADMIN_PERMISSION_DENIED",
          message: "No tiene permiso para abrir caja.",
          retryable: false,
          context: { required: "SALES:POS" }
        })
      );
    }
    const warehouseAccess = assertWarehouseAccess(actor, input.warehouseLocalId);
    if (!warehouseAccess.ok) {
      return err(warehouseAccess.error);
    }
    if (input.openingAmount < 0) {
      return err(
        createAppError({
          code: "BOX_OPENING_AMOUNT_INVALID",
          message: "El monto de apertura no puede ser negativo.",
          retryable: false
        })
      );
    }
    const existingOpenBox = await db.getOpenBoxByWarehouse(
      tenant.tenantSlug,
      input.warehouseLocalId
    );
    if (existingOpenBox) {
      return err(
        createAppError({
          code: "BOX_ALREADY_OPEN",
          message: "Ya existe una caja abierta para esta bodega.",
          retryable: false,
          context: { warehouseLocalId: input.warehouseLocalId }
        })
      );
    }

    const now = clock().toISOString();
    const localId = uuid();
    const openedAt = input.openedAt ?? now;
    const rpc = await supabase.rpc<RpcRow[]>("open_box_closing", {
      p_local_id: localId,
      p_warehouse_local_id: input.warehouseLocalId,
      p_opened_at: openedAt,
      p_opening_amount: input.openingAmount,
      p_notes: input.notes ?? null
    });
    if (rpc.error) {
      return err(
        createAppError({
          code: "BOX_OPEN_RPC_FAILED",
          message: rpc.error.message,
          retryable: true
        })
      );
    }
    const rpcRow = Array.isArray(rpc.data) ? rpc.data[0] : null;
    if (!rpcRow?.success) {
      return err(
        createAppError({
          code: rpcRow?.code ?? "BOX_OPEN_REJECTED",
          message: rpcRow?.message ?? "No se pudo abrir caja.",
          retryable: false
        })
      );
    }

    const box: BoxClosing = {
      localId,
      tenantId: tenant.tenantSlug,
      warehouseLocalId: input.warehouseLocalId,
      openedBy: actor.userId || "",
      closedBy: "",
      status: "open",
      openedAt,
      closedAt: "",
      openingAmount: input.openingAmount,
      expectedAmount: 0,
      countedAmount: 0,
      differenceAmount: 0,
      salesCount: 0,
      openingReading: "",
      closingReading: "",
      metadata: input.notes ? { notes: input.notes } : {},
      createdAt: now,
      updatedAt: now
    };
    await db.createBoxClosing(box);
    eventBus.emit("POS.BOX_OPENED", {
      tenantId: tenant.tenantSlug,
      localId: box.localId
    });
    return ok(box);
  };

  const listSales: SalesService["listSales"] = async (tenant) =>
    ok(await db.listSales(tenant.tenantSlug));

  const listSuspendedSales: SalesService["listSuspendedSales"] = async (tenant) =>
    ok(await db.listSuspendedSales(tenant.tenantSlug));

  const listBoxClosings: SalesService["listBoxClosings"] = async (tenant) =>
    ok(await db.listBoxClosings(tenant.tenantSlug));

  return {
    createSuspendedSale,
    createPosSale,
    restoreSuspendedSale,
    openBox,
    closeBox,
    listSales,
    listSuspendedSales,
    listBoxClosings
  };
};
