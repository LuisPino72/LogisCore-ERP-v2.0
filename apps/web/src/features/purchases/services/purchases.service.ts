import {
  createAppError,
  err,
  ok,
  type AppError,
  type EventBus,
  type Result,
  type SyncEngine
} from "@logiscore/core";
import type { StockMovementRecord, SupplierRecord } from "@/lib/db/dexie";
import type {
  CreatePurchaseInput,
  CreateSupplierInput,
  EditPurchaseInput,
  Purchase,
  PurchasesCatalogCreateCategoryCommand,
  PurchasesCatalogCreatePresentationCommand,
  PurchasesCatalogCreateProductCommand,
  PurchasesActorContext,
  PurchasesTenantContext,
  ReceivePurchaseInput,
  Receiving,
  InventoryLot,
  Supplier,
  UpdateSupplierInput
} from "../types/purchases.types";

export interface PurchasesDb {
  createSupplier(supplier: Supplier): Promise<void>;
  updateSupplier(supplier: Supplier): Promise<void>;
  listSuppliers(tenantId: string): Promise<Supplier[]>;
  getSupplierByLocalId(tenantId: string, localId: string): Promise<Supplier | undefined>;
  createPurchase(purchase: Purchase): Promise<void>;
  updatePurchase(purchase: Partial<Purchase> & { localId: string }): Promise<void>;
  listPurchases(tenantId: string): Promise<Purchase[]>;
  getPurchaseByLocalId(tenantId: string, localId: string): Promise<Purchase | undefined>;
  listReceivings(tenantId: string): Promise<Receiving[]>;
  listInventoryLots(tenantId: string): Promise<InventoryLot[]>;
  receivePurchase(
    tenantId: string,
    purchaseLocalId: string,
    purchasePatch: Partial<Purchase>,
    receiving: Receiving,
    stockMovements: StockMovementRecord[],
    inventoryLots: InventoryLot[]
  ): Promise<void>;
  updateProductPreferredSupplier(
    tenantId: string,
    productLocalId: string,
    supplierLocalId: string | null
  ): Promise<void>;
  getProductByLocalId(tenantId: string, localId: string): Promise<{ localId: string; tenantId: string; preferredSupplierLocalId?: string | null } | undefined>;
}

export interface PurchasesService {
  createSupplier(
    tenant: PurchasesTenantContext,
    actor: PurchasesActorContext,
    input: CreateSupplierInput
  ): Promise<Result<Supplier, AppError>>;
  updateSupplier(
    tenant: PurchasesTenantContext,
    actor: PurchasesActorContext,
    input: UpdateSupplierInput
  ): Promise<Result<Supplier, AppError>>;
  listSuppliers(
    tenant: PurchasesTenantContext
  ): Promise<Result<Supplier[], AppError>>;
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
  confirmPurchase(
    tenant: PurchasesTenantContext,
    actor: PurchasesActorContext,
    purchaseLocalId: string
  ): Promise<Result<Purchase, AppError>>;
  cancelPurchase(
    tenant: PurchasesTenantContext,
    actor: PurchasesActorContext,
    purchaseLocalId: string
  ): Promise<Result<Purchase, AppError>>;
  editPurchase(
    tenant: PurchasesTenantContext,
    actor: PurchasesActorContext,
    input: EditPurchaseInput
  ): Promise<Result<Purchase, AppError>>;
  setProductPreferredSupplier(
    tenant: PurchasesTenantContext,
    productLocalId: string,
    supplierLocalId: string | null
  ): Promise<Result<void, AppError>>;
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
          code: "PURCHASES_WAREHOUSE_ACCESS_DENIED",
          message: "El usuario no tiene acceso a la bodega seleccionada.",
          retryable: false,
          context: { warehouseLocalId }
        })
      );
    }
    return ok<void>(undefined);
  };

  const createSupplier: PurchasesService["createSupplier"] = async (
    tenant,
    actor,
    input
  ) => {
    if (!input.name.trim()) {
      return err(
        createAppError({
          code: "PURCHASES_SUPPLIER_NAME_REQUIRED",
          message: "El nombre del proveedor es obligatorio.",
          retryable: false
        })
      );
    }

    const now = clock().toISOString();
    const localId = uuid();
    const supplier: Supplier = {
      localId,
      tenantId: tenant.tenantSlug,
      name: input.name.trim(),
      ...(input.rif?.trim() ? { rif: input.rif.trim() } : {}),
      ...(input.phone?.trim() ? { phone: input.phone.trim() } : {}),
      ...(input.contactPerson?.trim() ? { contactPerson: input.contactPerson.trim() } : {}),
      ...(input.notes?.trim() ? { notes: input.notes.trim() } : {}),
      isActive: true,
      createdAt: now,
      updatedAt: now
    };

    const queueSupplier = await syncEngine.enqueue({
      id: uuid(),
      table: "suppliers",
      operation: "create",
      payload: {
        local_id: supplier.localId,
        tenant_slug: tenant.tenantSlug,
        name: supplier.name,
        rif: supplier.rif ?? null,
        phone: supplier.phone ?? null,
        contact_person: supplier.contactPerson ?? null,
        notes: supplier.notes ?? null,
        is_active: supplier.isActive,
        created_at: supplier.createdAt,
        updated_at: supplier.updatedAt
      },
      localId: supplier.localId,
      tenantId: tenant.tenantSlug,
      createdAt: now,
      attempts: 0
    });
    if (!queueSupplier.ok) {
      return err(queueSupplier.error);
    }

    await db.createSupplier(supplier);
    eventBus.emit("PURCHASES.SUPPLIER_CREATED", {
      tenantId: tenant.tenantSlug,
      localId: supplier.localId,
      name: supplier.name
    });
    return ok(supplier);
  };

  const updateSupplier: PurchasesService["updateSupplier"] = async (
    tenant,
    actor,
    input
  ) => {
    const existing = await db.getSupplierByLocalId(tenant.tenantSlug, input.localId);
    if (!existing) {
      return err(
        createAppError({
          code: "PURCHASES_SUPPLIER_NOT_FOUND",
          message: "El proveedor no existe.",
          retryable: false
        })
      );
    }

    const now = clock().toISOString();
    const updated: Supplier = {
      ...existing,
      name: input.name?.trim() ?? existing.name,
      updatedAt: now
    };
    if (input.rif !== undefined) {
      const trimmed = input.rif.trim();
      if (trimmed) (updated as unknown as Record<string, unknown>).rif = trimmed;
      else delete (updated as unknown as Record<string, unknown>).rif;
    }
    if (input.phone !== undefined) {
      const trimmed = input.phone.trim();
      if (trimmed) (updated as unknown as Record<string, unknown>).phone = trimmed;
      else delete (updated as unknown as Record<string, unknown>).phone;
    }
    if (input.contactPerson !== undefined) {
      const trimmed = input.contactPerson.trim();
      if (trimmed) (updated as unknown as Record<string, unknown>).contactPerson = trimmed;
      else delete (updated as unknown as Record<string, unknown>).contactPerson;
    }
    if (input.notes !== undefined) {
      const trimmed = input.notes.trim();
      if (trimmed) (updated as unknown as Record<string, unknown>).notes = trimmed;
      else delete (updated as unknown as Record<string, unknown>).notes;
    }

    const queueSupplier = await syncEngine.enqueue({
      id: uuid(),
      table: "suppliers",
      operation: "update",
      payload: {
        name: updated.name,
        rif: updated.rif ?? null,
        phone: updated.phone ?? null,
        contact_person: updated.contactPerson ?? null,
        notes: updated.notes ?? null,
        updated_at: updated.updatedAt
      },
      localId: updated.localId,
      tenantId: tenant.tenantSlug,
      createdAt: now,
      attempts: 0
    });
    if (!queueSupplier.ok) {
      return err(queueSupplier.error);
    }

    await db.updateSupplier(updated);
    eventBus.emit("PURCHASES.SUPPLIER_UPDATED", {
      tenantId: tenant.tenantSlug,
      localId: updated.localId,
      name: updated.name
    });
    return ok(updated);
  };

  const listSuppliers: PurchasesService["listSuppliers"] = async (tenant) =>
    ok(await db.listSuppliers(tenant.tenantSlug));

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
          code: "PURCHASES_ITEMS_REQUIRED",
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
          code: "PURCHASES_ITEM_INVALID",
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
      currency: "USD",
      exchangeRate: 1,
      subtotal,
      total: subtotal,
      items: input.items,
      receivedItems: [],
      createdAt: now,
      updatedAt: now,
      ...(input.supplierLocalId ? { supplierLocalId: input.supplierLocalId } : {}),
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
        supplier_local_id: purchase.supplierLocalId ?? null,
        supplier_name: purchase.supplierName ?? null,
        status: purchase.status,
        currency: purchase.currency,
        exchange_rate: purchase.exchangeRate,
        subtotal: purchase.subtotal,
        total: purchase.total,
        items: purchase.items,
        received_items: [],
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
    eventBus.emit("PURCHASES.CREATED", {
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
          code: "PURCHASES_NOT_FOUND",
          message: "La compra no existe para este tenant.",
          retryable: false,
          context: { purchaseLocalId: input.purchaseLocalId }
        })
      );
    }
    if (purchase.status === "cancelled") {
      return err(
        createAppError({
          code: "PURCHASES_CANCELLED_NOT_RECEIVABLE",
          message: "No se puede recibir una compra anulada.",
          retryable: false,
          context: { purchaseLocalId: input.purchaseLocalId }
        })
      );
    }
    if (purchase.status === "received") {
      return err(
        createAppError({
          code: "PURCHASES_ALREADY_RECEIVED",
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

    if (!input.receivedItems.length) {
      return err(
        createAppError({
          code: "PURCHASES_RECEIVE_NO_ITEMS",
          message: "Debe indicar al menos un item para recibir.",
          retryable: false
        })
      );
    }

    const now = clock().toISOString();
    const receivingLocalId = uuid();

    const receivedItemsDetail = input.receivedItems.map((ri) => {
      const orderedItem = purchase.items.find((i) => i.productLocalId === ri.productLocalId);
      return {
        productLocalId: ri.productLocalId,
        qtyOrdered: orderedItem?.qty ?? ri.qty,
        qtyReceived: ri.qty
      };
    });

    const isPartial = receivedItemsDetail.some(
      (ri) => ri.qtyReceived < ri.qtyOrdered
    );
    const newStatus = isPartial ? "partial_received" : "received";

    const updatedReceivedItems = [
      ...(purchase.receivedItems ?? []),
      ...receivedItemsDetail
    ];

    const receivingItems = input.receivedItems.map((ri) => {
      const orderedItem = purchase.items.find((i) => i.productLocalId === ri.productLocalId);
      return {
        productLocalId: ri.productLocalId,
        qty: ri.qty,
        unitCost: orderedItem?.unitCost ?? 0
      };
    });

    const receiving: Receiving = {
      localId: receivingLocalId,
      tenantId: tenant.tenantSlug,
      purchaseLocalId: purchase.localId,
      warehouseLocalId: purchase.warehouseLocalId,
      status: "posted",
      items: receivingItems,
      totalItems: receivingItems.reduce((acc, item) => acc + item.qty, 0),
      totalCost: receivingItems.reduce((acc, item) => acc + item.qty * item.unitCost, 0),
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
        status: newStatus,
        received_items: updatedReceivedItems,
        received_at: newStatus === "received" ? now : purchase.receivedAt,
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

    const purchasePatch: Partial<Purchase> = {
      status: newStatus,
      receivedItems: updatedReceivedItems,
      updatedAt: now
    };
    if (newStatus === "received") {
      purchasePatch.receivedAt = now;
    }

    await db.receivePurchase(
      tenant.tenantSlug,
      purchase.localId,
      purchasePatch,
      receiving,
      stockMovements,
      inventoryLots
    );

    eventBus.emit("PURCHASES.RECEIVED", {
      tenantId: tenant.tenantSlug,
      localId: purchase.localId,
      receivingLocalId: receiving.localId,
      warehouseLocalId: purchase.warehouseLocalId,
      isPartial
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

  const confirmPurchase: PurchasesService["confirmPurchase"] = async (
    tenant,
    actor,
    purchaseLocalId
  ) => {
    const purchase = await db.getPurchaseByLocalId(tenant.tenantSlug, purchaseLocalId);
    if (!purchase) {
      return err(
        createAppError({
          code: "PURCHASES_NOT_FOUND",
          message: "La compra no existe para este tenant.",
          retryable: false,
          context: { purchaseLocalId }
        })
      );
    }
    if (purchase.status !== "draft") {
      return err(
        createAppError({
          code: "PURCHASES_NOT_DRAFT",
          message: "Solo se pueden confirmar compras en estado borrador.",
          retryable: false,
          context: { purchaseLocalId, currentStatus: purchase.status }
        })
      );
    }

    const now = clock().toISOString();
    const purchasePatch: Partial<Purchase> = {
      status: "confirmed",
      updatedAt: now
    };

    const queuePurchase = await syncEngine.enqueue({
      id: uuid(),
      table: "purchases",
      operation: "update",
      payload: {
        local_id: purchase.localId,
        tenant_slug: tenant.tenantSlug,
        status: "confirmed",
        updated_at: now
      },
      localId: purchase.localId,
      tenantId: tenant.tenantSlug,
      createdAt: now,
      attempts: 0
    });
    if (!queuePurchase.ok) {
      return err(queuePurchase.error);
    }

    await db.updatePurchase({ localId: purchase.localId, ...purchasePatch });
    eventBus.emit("PURCHASES.CONFIRMED", {
      tenantId: tenant.tenantSlug,
      localId: purchase.localId
    });
    return ok({ ...purchase, ...purchasePatch });
  };

  const cancelPurchase: PurchasesService["cancelPurchase"] = async (
    tenant,
    actor,
    purchaseLocalId
  ) => {
    const purchase = await db.getPurchaseByLocalId(tenant.tenantSlug, purchaseLocalId);
    if (!purchase) {
      return err(
        createAppError({
          code: "PURCHASES_NOT_FOUND",
          message: "La compra no existe para este tenant.",
          retryable: false,
          context: { purchaseLocalId }
        })
      );
    }
    if (purchase.status === "received") {
      return err(
        createAppError({
          code: "PURCHASES_RECEIVED_NOT_CANCELLABLE",
          message: "No se puede anular una compra ya recibida.",
          retryable: false,
          context: { purchaseLocalId }
        })
      );
    }
    if (purchase.status === "cancelled") {
      return err(
        createAppError({
          code: "PURCHASES_ALREADY_CANCELLED",
          message: "La compra ya fue anulada previamente.",
          retryable: false,
          context: { purchaseLocalId }
        })
      );
    }

    const now = clock().toISOString();
    const purchasePatch: Partial<Purchase> = {
      status: "cancelled",
      updatedAt: now
    };

    const queuePurchase = await syncEngine.enqueue({
      id: uuid(),
      table: "purchases",
      operation: "update",
      payload: {
        local_id: purchase.localId,
        tenant_slug: tenant.tenantSlug,
        status: "cancelled",
        updated_at: now
      },
      localId: purchase.localId,
      tenantId: tenant.tenantSlug,
      createdAt: now,
      attempts: 0
    });
    if (!queuePurchase.ok) {
      return err(queuePurchase.error);
    }

    await db.updatePurchase({ localId: purchase.localId, ...purchasePatch });
    eventBus.emit("PURCHASES.CANCELLED", {
      tenantId: tenant.tenantSlug,
      localId: purchase.localId
    });
    return ok({ ...purchase, ...purchasePatch });
  };

  const editPurchase: PurchasesService["editPurchase"] = async (
    tenant,
    actor,
    input
  ) => {
    const purchase = await db.getPurchaseByLocalId(tenant.tenantSlug, input.purchaseLocalId);
    if (!purchase) {
      return err(
        createAppError({
          code: "PURCHASES_NOT_FOUND",
          message: "La compra no existe para este tenant.",
          retryable: false,
          context: { purchaseLocalId: input.purchaseLocalId }
        })
      );
    }
    if (purchase.status !== "draft") {
      return err(
        createAppError({
          code: "PURCHASES_NOT_DRAFT_NOT_EDITABLE",
          message: "Solo se pueden editar compras en estado borrador.",
          retryable: false,
          context: { purchaseLocalId: input.purchaseLocalId, currentStatus: purchase.status }
        })
      );
    }
    if (!input.items.length) {
      return err(
        createAppError({
          code: "PURCHASES_ITEMS_REQUIRED",
          message: "La compra requiere al menos un item.",
          retryable: false
        })
      );
    }

    const warehouseAccess = assertWarehouseAccess(actor, purchase.warehouseLocalId);
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
          code: "PURCHASES_ITEM_INVALID",
          message: "Todos los items de compra deben tener producto, cantidad y costo valido.",
          retryable: false
        })
      );
    }

    const now = clock().toISOString();
    const subtotal = input.items.reduce(
      (acc, item) => acc + item.qty * item.unitCost,
      0
    );
    const purchasePatch: Partial<Purchase> = {
      items: input.items,
      subtotal,
      total: subtotal,
      updatedAt: now
    };

    const queuePurchase = await syncEngine.enqueue({
      id: uuid(),
      table: "purchases",
      operation: "update",
      payload: {
        local_id: purchase.localId,
        tenant_slug: tenant.tenantSlug,
        items: input.items,
        subtotal,
        total: subtotal,
        updated_at: now
      },
      localId: purchase.localId,
      tenantId: tenant.tenantSlug,
      createdAt: now,
      attempts: 0
    });
    if (!queuePurchase.ok) {
      return err(queuePurchase.error);
    }

    await db.updatePurchase({ localId: purchase.localId, ...purchasePatch });
    eventBus.emit("PURCHASES.UPDATED", {
      tenantId: tenant.tenantSlug,
      localId: purchase.localId
    });
    return ok({ ...purchase, ...purchasePatch });
  };

  const setProductPreferredSupplier: PurchasesService["setProductPreferredSupplier"] = async (
    tenant,
    productLocalId,
    supplierLocalId
  ) => {
    if (supplierLocalId) {
      const supplier = await db.getSupplierByLocalId(tenant.tenantSlug, supplierLocalId);
      if (!supplier) {
        return err(
          createAppError({
            code: "PURCHASES_SUPPLIER_NOT_FOUND",
            message: "El proveedor no existe.",
            retryable: false
          })
        );
      }
    }

    const product = await db.getProductByLocalId(tenant.tenantSlug, productLocalId);
    if (!product) {
      return err(
        createAppError({
          code: "PURCHASES_PRODUCT_NOT_FOUND",
          message: "El producto no existe.",
          retryable: false
        })
      );
    }

    const now = clock().toISOString();

    const queueProduct = await syncEngine.enqueue({
      id: uuid(),
      table: "products",
      operation: "update",
      payload: {
        local_id: product.localId,
        tenant_slug: tenant.tenantSlug,
        preferred_supplier_local_id: supplierLocalId,
        updated_at: now
      },
      localId: product.localId,
      tenantId: tenant.tenantSlug,
      createdAt: now,
      attempts: 0
    });
    if (!queueProduct.ok) {
      return err(queueProduct.error);
    }

    await db.updateProductPreferredSupplier(tenant.tenantSlug, productLocalId, supplierLocalId);
    eventBus.emit("PURCHASES.PRODUCT_SUPPLIER_UPDATED", {
      tenantId: tenant.tenantSlug,
      localId: productLocalId,
      supplierLocalId
    });
    return ok<void>(undefined);
  };

  return {
    createSupplier,
    updateSupplier,
    listSuppliers,
    requestCreateCategory,
    requestCreateProduct,
    requestCreatePresentation,
    createPurchase,
    receivePurchase,
    listPurchases,
    listReceivings,
    listInventoryLots,
    confirmPurchase,
    cancelPurchase,
    editPurchase,
    setProductPreferredSupplier
  };
};
