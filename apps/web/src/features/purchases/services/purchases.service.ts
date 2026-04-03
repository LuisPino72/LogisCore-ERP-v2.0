/**
 * Interfaz del adaptador de base de datos para compras.
 * Define las operaciones CRUD básicas sobre compras, recepciones y lotes.
 */

import {
  createAppError,
  err,
  ok,
  type AppError,
  type EventBus,
  type Result,
  type SyncEngine
} from "@logiscore/core";
import type { StockMovementRecord } from "@/lib/db/dexie";
import type {
  CreatePurchaseInput,
  Purchase,
  PurchasesCatalogCreateCategoryCommand,
  PurchasesCatalogCreatePresentationCommand,
  PurchasesCatalogCreateProductCommand,
  PurchasesActorContext,
  PurchasesTenantContext,
  ReceivePurchaseInput,
  Receiving,
  InventoryLot
} from "../types/purchases.types";

export interface PurchasesDb {
  createPurchase(purchase: Purchase): Promise<void>;
  listPurchases(tenantId: string): Promise<Purchase[]>;
  getPurchaseByLocalId(tenantId: string, localId: string): Promise<Purchase | undefined>;
  listReceivings(tenantId: string): Promise<Receiving[]>;
  listInventoryLots(tenantId: string): Promise<InventoryLot[]>;
  receivePurchase(
    tenantId: string,
    purchaseLocalId: string,
    purchasePatch: Pick<Purchase, "status" | "receivedAt" | "updatedAt">,
    receiving: Receiving,
    stockMovements: StockMovementRecord[],
    inventoryLots: InventoryLot[]
  ): Promise<void>;
}

/**
 * Interfaz del servicio de compras.
 * Define todas las operaciones de negocio relacionadas con compras.
 * Todas las funciones retornan Result<T, AppError> para manejo de errores.
 */
export interface PurchasesService {
  requestCreateCategory(
    input: PurchasesCatalogCreateCategoryCommand
  ): Promise<Result<void, AppError>>;
  requestCreateProduct(
    input: PurchasesCatalogCreateProductCommand
  ): Promise<Result<void, AppError>>;
  requestCreatePresentation(
    input: PurchasesCatalogCreatePresentationCommand
  ): Promise<Result<void, AppError>>;
  createPurchase(
    tenant: PurchasesTenantContext,
    actor: PurchasesActorContext,
    input: CreatePurchaseInput
  ): Promise<Result<Purchase, AppError>>;
  receivePurchase(
    tenant: PurchasesTenantContext,
    actor: PurchasesActorContext,
    input: ReceivePurchaseInput
  ): Promise<Result<Receiving, AppError>>;
  listPurchases(
    tenant: PurchasesTenantContext
  ): Promise<Result<Purchase[], AppError>>;
  listReceivings(
    tenant: PurchasesTenantContext
  ): Promise<Result<Receiving[], AppError>>;
  listInventoryLots(
    tenant: PurchasesTenantContext
  ): Promise<Result<InventoryLot[], AppError>>;
}

interface CreatePurchasesServiceDependencies {
  eventBus: EventBus;
  db: PurchasesDb;
  syncEngine: SyncEngine;
  clock?: () => Date;
  uuid?: () => string;
}

export const createPurchasesService = ({
  eventBus,
  db,
  syncEngine,
  clock = () => new Date(),
  uuid = () => crypto.randomUUID()
}: CreatePurchasesServiceDependencies): PurchasesService => {
  const assertWarehouseAccess = (
    actor: PurchasesActorContext,
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

  const requestCreateCategory: PurchasesService["requestCreateCategory"] = async (
    input
  ) => {
    if (!input.name.trim()) {
      return err(
        createAppError({
          code: "PURCHASES_CATEGORY_NAME_REQUIRED",
          message: "Debe indicar nombre para la categoria.",
          retryable: false
        })
      );
    }

    eventBus.emit("PURCHASES.CATEGORY_CREATE_REQUESTED", input);
    return ok<void>(undefined);
  };

  const requestCreateProduct: PurchasesService["requestCreateProduct"] = async (
    input
  ) => {
    if (!input.name.trim()) {
      return err(
        createAppError({
          code: "PURCHASES_PRODUCT_NAME_REQUIRED",
          message: "Debe indicar nombre para el producto.",
          retryable: false
        })
      );
    }

    eventBus.emit("PURCHASES.PRODUCT_CREATE_REQUESTED", input);
    return ok<void>(undefined);
  };

  const requestCreatePresentation: PurchasesService["requestCreatePresentation"] = async (
    input
  ) => {
    if (!input.productLocalId.trim()) {
      return err(
        createAppError({
          code: "PURCHASES_PRESENTATION_PRODUCT_REQUIRED",
          message: "Debe seleccionar un producto para la presentacion.",
          retryable: false
        })
      );
    }
    if (!input.name.trim() || input.factor <= 0) {
      return err(
        createAppError({
          code: "PURCHASES_PRESENTATION_INVALID",
          message: "Presentacion invalida.",
          retryable: false
        })
      );
    }

    eventBus.emit("PURCHASES.PRESENTATION_CREATE_REQUESTED", input);
    return ok<void>(undefined);
  };

  const createPurchase: PurchasesService["createPurchase"] = async (
    tenant,
    actor,
    input
  ) => {
    if (!input.items.length) {
      return err(
        createAppError({
          code: "PURCHASE_ITEMS_REQUIRED",
          message: "La compra requiere al menos un item.",
          retryable: false
        })
      );
    }
    const warehouseAccess = assertWarehouseAccess(actor, input.warehouseLocalId);
    if (!warehouseAccess.ok) {
      return err(warehouseAccess.error);
    }

    const hasInvalidItem = input.items.some(
      (item) =>
        !item.productLocalId.trim() || item.qty <= 0 || item.unitCost < 0
    );
    if (hasInvalidItem) {
      return err(
        createAppError({
          code: "PURCHASE_ITEM_INVALID",
          message: "Todos los items de compra deben tener producto, cantidad y costo valido.",
          retryable: false
        })
      );
    }

    const now = clock().toISOString();
    const localId = uuid();
    const subtotal = input.items.reduce(
      (acc, item) => acc + item.qty * item.unitCost,
      0
    );
    const purchase: Purchase = {
      localId,
      tenantId: tenant.tenantSlug,
      warehouseLocalId: input.warehouseLocalId,
      status: "draft",
      subtotal,
      total: subtotal,
      items: input.items,
      createdAt: now,
      updatedAt: now,
      ...(input.supplierName?.trim() ? { supplierName: input.supplierName.trim() } : {}),
      ...(actor.userId ? { createdBy: actor.userId } : {})
    };

    const queuePurchase = await syncEngine.enqueue({
      id: uuid(),
      table: "purchases",
      operation: "create",
      payload: {
        local_id: purchase.localId,
        tenant_slug: tenant.tenantSlug,
        warehouse_local_id: purchase.warehouseLocalId,
        supplier_name: purchase.supplierName ?? null,
        status: purchase.status,
        subtotal: purchase.subtotal,
        total: purchase.total,
        items: purchase.items,
        created_by: purchase.createdBy ?? null,
        created_at: purchase.createdAt,
        updated_at: purchase.updatedAt
      },
      localId: purchase.localId,
      tenantId: tenant.tenantSlug,
      createdAt: now,
      attempts: 0
    });
    if (!queuePurchase.ok) {
      return err(queuePurchase.error);
    }

    await db.createPurchase(purchase);
    eventBus.emit("PURCHASE.CREATED", {
      tenantId: tenant.tenantSlug,
      localId: purchase.localId,
      warehouseLocalId: purchase.warehouseLocalId
    });
    return ok(purchase);
  };

  const receivePurchase: PurchasesService["receivePurchase"] = async (
    tenant,
    actor,
    input
  ) => {
    const purchase = await db.getPurchaseByLocalId(tenant.tenantSlug, input.purchaseLocalId);
    if (!purchase) {
      return err(
        createAppError({
          code: "PURCHASE_NOT_FOUND",
          message: "La compra no existe para este tenant.",
          retryable: false,
          context: { purchaseLocalId: input.purchaseLocalId }
        })
      );
    }
    if (purchase.status === "cancelled") {
      return err(
        createAppError({
          code: "PURCHASE_CANCELLED_NOT_RECEIVABLE",
          message: "No se puede recibir una compra anulada.",
          retryable: false,
          context: { purchaseLocalId: input.purchaseLocalId }
        })
      );
    }
    if (purchase.status === "received") {
      return err(
        createAppError({
          code: "PURCHASE_ALREADY_RECEIVED",
          message: "La compra ya fue recibida previamente.",
          retryable: false,
          context: { purchaseLocalId: input.purchaseLocalId }
        })
      );
    }

    const warehouseAccess = assertWarehouseAccess(actor, purchase.warehouseLocalId);
    if (!warehouseAccess.ok) {
      return err(warehouseAccess.error);
    }

    const now = clock().toISOString();
    const receivingLocalId = uuid();
    const receiving: Receiving = {
      localId: receivingLocalId,
      tenantId: tenant.tenantSlug,
      purchaseLocalId: purchase.localId,
      warehouseLocalId: purchase.warehouseLocalId,
      status: "posted",
      items: purchase.items.map((item) => ({
        productLocalId: item.productLocalId,
        qty: item.qty,
        unitCost: item.unitCost
      })),
      totalItems: purchase.items.reduce((acc, item) => acc + item.qty, 0),
      totalCost: purchase.total,
      createdAt: now,
      updatedAt: now,
      ...(actor.userId ? { receivedBy: actor.userId } : {}),
      ...(input.notes?.trim() ? { notes: input.notes.trim() } : {})
    };
    const stockMovements: StockMovementRecord[] = receiving.items.map((item) => ({
      localId: uuid(),
      tenantId: tenant.tenantSlug,
      productLocalId: item.productLocalId,
      warehouseLocalId: purchase.warehouseLocalId,
      movementType: "purchase_in",
      quantity: item.qty,
      unitCost: item.unitCost,
      referenceType: "purchase_receiving",
      referenceLocalId: receiving.localId,
      notes: "Entrada por recepcion de compra",
      createdAt: now,
      ...(actor.userId ? { createdBy: actor.userId } : {})
    }));
    const inventoryLots: InventoryLot[] = receiving.items.map((item) => ({
      localId: uuid(),
      tenantId: tenant.tenantSlug,
      productLocalId: item.productLocalId,
      warehouseLocalId: purchase.warehouseLocalId,
      sourceType: "purchase_receiving",
      sourceLocalId: receiving.localId,
      quantity: item.qty,
      unitCost: item.unitCost,
      status: "active",
      createdAt: now,
      updatedAt: now
    }));

    const queueReceiving = await syncEngine.enqueue({
      id: uuid(),
      table: "receivings",
      operation: "create",
      payload: {
        local_id: receiving.localId,
        tenant_slug: tenant.tenantSlug,
        purchase_local_id: receiving.purchaseLocalId,
        warehouse_local_id: receiving.warehouseLocalId,
        status: receiving.status,
        items: receiving.items,
        total_items: receiving.totalItems,
        total_cost: receiving.totalCost,
        received_by: receiving.receivedBy ?? null,
        notes: receiving.notes ?? null,
        created_at: receiving.createdAt,
        updated_at: receiving.updatedAt
      },
      localId: receiving.localId,
      tenantId: tenant.tenantSlug,
      createdAt: now,
      attempts: 0
    });
    if (!queueReceiving.ok) {
      return err(queueReceiving.error);
    }

    const queuePurchaseUpdate = await syncEngine.enqueue({
      id: uuid(),
      table: "purchases",
      operation: "update",
      payload: {
        local_id: purchase.localId,
        tenant_slug: tenant.tenantSlug,
        status: "received",
        received_at: now,
        updated_at: now
      },
      localId: purchase.localId,
      tenantId: tenant.tenantSlug,
      createdAt: now,
      attempts: 0
    });
    if (!queuePurchaseUpdate.ok) {
      return err(queuePurchaseUpdate.error);
    }

    for (const movement of stockMovements) {
      const queueMovement = await syncEngine.enqueue({
        id: uuid(),
        table: "stock_movements",
        operation: "create",
        payload: {
          local_id: movement.localId,
          tenant_slug: tenant.tenantSlug,
          product_local_id: movement.productLocalId,
          warehouse_local_id: movement.warehouseLocalId,
          movement_type: movement.movementType,
          quantity: movement.quantity,
          unit_cost: movement.unitCost,
          reference_type: movement.referenceType,
          reference_local_id: movement.referenceLocalId,
          notes: movement.notes,
          created_by: movement.createdBy,
          created_at: movement.createdAt
        },
        localId: movement.localId,
        tenantId: tenant.tenantSlug,
        createdAt: now,
        attempts: 0
      });
      if (!queueMovement.ok) {
        return err(queueMovement.error);
      }
    }

    await db.receivePurchase(
      tenant.tenantSlug,
      purchase.localId,
      {
        status: "received",
        receivedAt: now,
        updatedAt: now
      },
      receiving,
      stockMovements,
      inventoryLots
    );

    eventBus.emit("PURCHASE.RECEIVED", {
      tenantId: tenant.tenantSlug,
      localId: purchase.localId,
      receivingLocalId: receiving.localId,
      warehouseLocalId: purchase.warehouseLocalId
    });
    for (const movement of stockMovements) {
      eventBus.emit("INVENTORY.STOCK_MOVEMENT_RECORDED", {
        tenantId: tenant.tenantSlug,
        localId: movement.localId,
        productLocalId: movement.productLocalId,
        warehouseLocalId: movement.warehouseLocalId
      });
    }
    return ok(receiving);
  };

  const listPurchases: PurchasesService["listPurchases"] = async (tenant) =>
    ok(await db.listPurchases(tenant.tenantSlug));

  const listReceivings: PurchasesService["listReceivings"] = async (tenant) =>
    ok(await db.listReceivings(tenant.tenantSlug));

  const listInventoryLots: PurchasesService["listInventoryLots"] = async (tenant) =>
    ok(await db.listInventoryLots(tenant.tenantSlug));

  return {
    requestCreateCategory,
    requestCreateProduct,
    requestCreatePresentation,
    createPurchase,
    receivePurchase,
    listPurchases,
    listReceivings,
    listInventoryLots
  };
};
