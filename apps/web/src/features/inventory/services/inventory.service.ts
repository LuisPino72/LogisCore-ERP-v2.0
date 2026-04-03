/**
 * Servicio principal para gestionar inventarios, almacenes y movimientos de stock.
 * Implementa la lógica de negocio para todas las operaciones de inventario.
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
import type {
  CreateInventoryCountInput,
  CreateProductSizeColorInput,
  CreateWarehouseInput,
  InventoryActorContext,
  InventoryCount,
  InventoryTenantContext,
  ProductSizeColor,
  ReorderSuggestion,
  RecordStockMovementInput,
  StockMovement,
  Warehouse
} from "../types/inventory.types";

/**
 * Interfaz del adaptador de base de datos para inventario.
 * Define las operaciones CRUD básicas sobre almacenes, movimientos y conteos.
 */
export interface InventoryDb {
  createWarehouse(warehouse: Warehouse): Promise<void>;
  listWarehouses(tenantId: string): Promise<Warehouse[]>;
  createProductSizeColor(item: ProductSizeColor): Promise<void>;
  listProductSizeColors(tenantId: string): Promise<ProductSizeColor[]>;
  createStockMovement(movement: StockMovement): Promise<void>;
  listStockMovements(tenantId: string): Promise<StockMovement[]>;
  getStockBalance(
    tenantId: string,
    productLocalId: string,
    warehouseLocalId: string
  ): Promise<number>;
  createInventoryCount(count: InventoryCount): Promise<void>;
  listInventoryCounts(tenantId: string): Promise<InventoryCount[]>;
  getInventoryCountById(
    tenantId: string,
    localId: string
  ): Promise<InventoryCount | null>;
  postInventoryCount(
    tenantId: string,
    localId: string,
    updatedCount: InventoryCount,
    movement?: StockMovement
  ): Promise<void>;
}

/**
 * Interfaz del servicio de inventario.
 * Define todas las operaciones de negocio relacionadas con el inventario.
 * Todas las funciones retornan Result<T, AppError> para manejo de errores.
 */
export interface InventoryService {
  createWarehouse(
    tenant: InventoryTenantContext,
    actor: InventoryActorContext,
    input: CreateWarehouseInput
  ): Promise<Result<Warehouse, AppError>>;
  listWarehouses(
    tenant: InventoryTenantContext
  ): Promise<Result<Warehouse[], AppError>>;
  createProductSizeColor(
    tenant: InventoryTenantContext,
    actor: InventoryActorContext,
    input: CreateProductSizeColorInput
  ): Promise<Result<ProductSizeColor, AppError>>;
  listProductSizeColors(
    tenant: InventoryTenantContext
  ): Promise<Result<ProductSizeColor[], AppError>>;
  recordStockMovement(
    tenant: InventoryTenantContext,
    actor: InventoryActorContext,
    input: RecordStockMovementInput
  ): Promise<Result<StockMovement, AppError>>;
  listStockMovements(
    tenant: InventoryTenantContext
  ): Promise<Result<StockMovement[], AppError>>;
  getStockBalance(
    tenant: InventoryTenantContext,
    productLocalId: string,
    warehouseLocalId: string
  ): Promise<Result<number, AppError>>;
  createInventoryCount(
    tenant: InventoryTenantContext,
    actor: InventoryActorContext,
    input: CreateInventoryCountInput
  ): Promise<Result<InventoryCount, AppError>>;
  postInventoryCount(
    tenant: InventoryTenantContext,
    actor: InventoryActorContext,
    inventoryCountLocalId: string
  ): Promise<Result<InventoryCount, AppError>>;
  listInventoryCounts(
    tenant: InventoryTenantContext
  ): Promise<Result<InventoryCount[], AppError>>;
  getReorderSuggestions(
    tenant: InventoryTenantContext,
    actor: InventoryActorContext,
    options?: { minStock?: number; targetStock?: number }
  ): Promise<Result<ReorderSuggestion[], AppError>>;
}

interface InventoryServiceDependencies {
  db: InventoryDb;
  syncEngine: SyncEngine;
  eventBus: EventBus;
  clock?: () => Date;
  uuid?: () => string;
}

const incomingMovementTypes = new Set<StockMovement["movementType"]>([
  "purchase_in",
  "adjustment_in",
  "production_in",
  "transfer_in",
  "count_adjustment"
]);

export const createInventoryService = ({
  db,
  syncEngine,
  eventBus,
  clock = () => new Date(),
  uuid = () => crypto.randomUUID()
}: InventoryServiceDependencies): InventoryService => {
  const assertAdjustPermission = (
    actor: InventoryActorContext
  ): Result<void, AppError> => {
    if (
      actor.role === "owner" ||
      actor.role === "admin" ||
      actor.permissions.canAdjustStock
    ) {
      return ok<void>(undefined);
    }
    return err(
      createAppError({
        code: "INVENTORY_PERMISSION_DENIED",
        message: "El usuario no tiene permisos para ajustar inventario.",
        retryable: false
      })
    );
  };

  const assertWarehouseAccess = (
    actor: InventoryActorContext,
    warehouseLocalId: string
  ): Result<void, AppError> => {
    if (actor.role === "owner" || actor.role === "admin") {
      return ok<void>(undefined);
    }
    const allowed = actor.permissions.allowedWarehouseLocalIds;
    if (!allowed?.length || !allowed.includes(warehouseLocalId)) {
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

  const createWarehouse: InventoryService["createWarehouse"] = async (
    tenant,
    actor,
    input
  ) => {
    const permissionResult = assertAdjustPermission(actor);
    if (!permissionResult.ok) {
      return err(permissionResult.error);
    }

    if (!input.name.trim()) {
      return err(
        createAppError({
          code: "WAREHOUSE_NAME_REQUIRED",
          message: "El nombre de la bodega es obligatorio.",
          retryable: false
        })
      );
    }

    const now = clock().toISOString();
    const warehouse: Warehouse = {
      localId: uuid(),
      tenantId: tenant.tenantSlug,
      name: input.name.trim(),
      isActive: true,
      createdAt: now,
      updatedAt: now,
      ...(input.code?.trim() && { code: input.code.trim() }),
      ...(input.address?.trim() && { address: input.address.trim() }),
      ...(input.contactPerson?.trim() && { contactPerson: input.contactPerson.trim() }),
      ...(input.phone?.trim() && { phone: input.phone.trim() }),
      ...(input.capacityVolumen !== undefined && { capacityVolumen: input.capacityVolumen }),
      ...(input.capacityPeso !== undefined && { capacityPeso: input.capacityPeso }),
      ...(input.isDefault !== undefined && { isDefault: input.isDefault })
    };

    const syncResult = await syncEngine.enqueue({
      id: uuid(),
      table: "warehouses",
      operation: "create",
      payload: {
        local_id: warehouse.localId,
        tenant_slug: tenant.tenantSlug,
        name: warehouse.name,
        code: warehouse.code,
        is_active: warehouse.isActive,
        created_at: warehouse.createdAt,
        updated_at: warehouse.updatedAt
      },
      localId: warehouse.localId,
      tenantId: tenant.tenantSlug,
      createdAt: now,
      attempts: 0
    });
    if (!syncResult.ok) {
      return err(syncResult.error);
    }

    await db.createWarehouse(warehouse);
    eventBus.emit("INVENTORY.WAREHOUSE_CREATED", {
      tenantId: tenant.tenantSlug,
      localId: warehouse.localId
    });
    return ok(warehouse);
  };

  const listWarehouses: InventoryService["listWarehouses"] = async (tenant) =>
    ok(await db.listWarehouses(tenant.tenantSlug));

  const createProductSizeColor: InventoryService["createProductSizeColor"] = async (
    tenant,
    actor,
    input
  ) => {
    const permissionResult = assertAdjustPermission(actor);
    if (!permissionResult.ok) {
      return err(permissionResult.error);
    }
    if (!input.productLocalId.trim()) {
      return err(
        createAppError({
          code: "SIZE_COLOR_PRODUCT_REQUIRED",
          message: "Debe indicar producto para talla/color.",
          retryable: false
        })
      );
    }

    const now = clock().toISOString();
    const item: ProductSizeColor = {
      localId: uuid(),
      tenantId: tenant.tenantSlug,
      productLocalId: input.productLocalId,
      size: input.size?.trim() || "",
      color: input.color?.trim() || "",
      skuSuffix: input.skuSuffix?.trim() || "",
      barcode: input.barcode?.trim() || "",
      createdAt: now,
      updatedAt: now
    };

    const syncResult = await syncEngine.enqueue({
      id: uuid(),
      table: "product_size_colors",
      operation: "create",
      payload: {
        local_id: item.localId,
        tenant_slug: tenant.tenantSlug,
        product_local_id: item.productLocalId,
        size: item.size || null,
        color: item.color || null,
        sku_suffix: item.skuSuffix || null,
        barcode: item.barcode || null,
        created_at: item.createdAt,
        updated_at: item.updatedAt
      },
      localId: item.localId,
      tenantId: tenant.tenantSlug,
      createdAt: now,
      attempts: 0
    });
    if (!syncResult.ok) {
      return err(syncResult.error);
    }

    await db.createProductSizeColor(item);
    eventBus.emit("INVENTORY.SIZE_COLOR_CREATED", {
      tenantId: tenant.tenantSlug,
      localId: item.localId
    });
    return ok(item);
  };

  const listProductSizeColors: InventoryService["listProductSizeColors"] = async (
    tenant
  ) => ok(await db.listProductSizeColors(tenant.tenantSlug));

  const recordStockMovement: InventoryService["recordStockMovement"] = async (
    tenant,
    actor,
    input
  ) => {
    if (!input.productLocalId.trim() || !input.warehouseLocalId.trim()) {
      return err(
        createAppError({
          code: "STOCK_MOVEMENT_REFERENCE_REQUIRED",
          message: "Producto y bodega son obligatorios para movimiento de stock.",
          retryable: false
        })
      );
    }
    if (input.quantity <= 0) {
      return err(
        createAppError({
          code: "STOCK_MOVEMENT_QUANTITY_INVALID",
          message: "La cantidad debe ser mayor a cero.",
          retryable: false
        })
      );
    }
    const warehouseAccess = assertWarehouseAccess(actor, input.warehouseLocalId);
    if (!warehouseAccess.ok) {
      return err(warehouseAccess.error);
    }

    if (
      input.movementType === "adjustment_in" ||
      input.movementType === "adjustment_out"
    ) {
      const permissionResult = assertAdjustPermission(actor);
      if (!permissionResult.ok) {
        return err(permissionResult.error);
      }
    }

    const currentBalance = await db.getStockBalance(
      tenant.tenantSlug,
      input.productLocalId,
      input.warehouseLocalId
    );
    const signedQty = incomingMovementTypes.has(input.movementType)
      ? input.quantity
      : -input.quantity;
    const resultingBalance = currentBalance + signedQty;
    if (resultingBalance < 0) {
      return err(
        createAppError({
          code: "NEGATIVE_STOCK_FORBIDDEN",
          message: "El movimiento genera stock negativo y esta prohibido.",
          retryable: false,
          context: {
            currentBalance,
            quantity: input.quantity,
            movementType: input.movementType
          }
        })
      );
    }

    const now = clock().toISOString();
    const movement: StockMovement = {
      localId: uuid(),
      tenantId: tenant.tenantSlug,
      productLocalId: input.productLocalId,
      warehouseLocalId: input.warehouseLocalId,
      movementType: input.movementType,
      quantity: input.quantity,
      createdAt: now,
      ...(input.unitCost !== undefined && { unitCost: input.unitCost }),
      ...(input.referenceType && { referenceType: input.referenceType }),
      ...(input.referenceLocalId && { referenceLocalId: input.referenceLocalId }),
      ...(input.referenceDocumentType && { referenceDocumentType: input.referenceDocumentType }),
      ...(input.costLayerId && { costLayerId: input.costLayerId }),
      ...(input.notes && { notes: input.notes }),
      ...(actor.userId && { createdBy: actor.userId })
    };

    const syncResult = await syncEngine.enqueue({
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
        reference_document_type: movement.referenceDocumentType,
        cost_layer_id: movement.costLayerId,
        notes: movement.notes,
        created_by: movement.createdBy,
        created_at: movement.createdAt
      },
      localId: movement.localId,
      tenantId: tenant.tenantSlug,
      createdAt: now,
      attempts: 0
    });
    if (!syncResult.ok) {
      return err(syncResult.error);
    }

    await db.createStockMovement(movement);
    eventBus.emit("INVENTORY.STOCK_MOVEMENT_RECORDED", {
      tenantId: tenant.tenantSlug,
      localId: movement.localId,
      productLocalId: movement.productLocalId,
      warehouseLocalId: movement.warehouseLocalId
    });
    return ok(movement);
  };

  const listStockMovements: InventoryService["listStockMovements"] = async (tenant) =>
    ok(await db.listStockMovements(tenant.tenantSlug));

  const getStockBalance: InventoryService["getStockBalance"] = async (
    tenant,
    productLocalId,
    warehouseLocalId
  ) => ok(await db.getStockBalance(tenant.tenantSlug, productLocalId, warehouseLocalId));

  const createInventoryCount: InventoryService["createInventoryCount"] = async (
    tenant,
    actor,
    input
  ) => {
    const permissionResult = assertAdjustPermission(actor);
    if (!permissionResult.ok) {
      return err(permissionResult.error);
    }
    if (input.countedQty < 0) {
      return err(
        createAppError({
          code: "INVENTORY_COUNT_INVALID",
          message: "El conteo no puede ser negativo.",
          retryable: false
        })
      );
    }
    const warehouseAccess = assertWarehouseAccess(actor, input.warehouseLocalId);
    if (!warehouseAccess.ok) {
      return err(warehouseAccess.error);
    }

    const expectedQty = await db.getStockBalance(
      tenant.tenantSlug,
      input.productLocalId,
      input.warehouseLocalId
    );
    const now = clock().toISOString();
    const count: InventoryCount = {
      localId: uuid(),
      tenantId: tenant.tenantSlug,
      warehouseLocalId: input.warehouseLocalId,
      productLocalId: input.productLocalId,
      expectedQty,
      countedQty: input.countedQty,
      differenceQty: input.countedQty - expectedQty,
      status: "draft",
      createdAt: now,
      updatedAt: now,
      ...(input.reason && { reason: input.reason })
    };

    const syncResult = await syncEngine.enqueue({
      id: uuid(),
      table: "inventory_counts",
      operation: "create",
      payload: {
        local_id: count.localId,
        tenant_slug: tenant.tenantSlug,
        warehouse_local_id: count.warehouseLocalId,
        product_local_id: count.productLocalId,
        expected_qty: count.expectedQty,
        counted_qty: count.countedQty,
        difference_qty: count.differenceQty,
        status: count.status,
        reason: count.reason,
        created_at: count.createdAt,
        updated_at: count.updatedAt
      },
      localId: count.localId,
      tenantId: tenant.tenantSlug,
      createdAt: now,
      attempts: 0
    });
    if (!syncResult.ok) {
      return err(syncResult.error);
    }

    await db.createInventoryCount(count);
    eventBus.emit("INVENTORY.COUNT_CREATED", {
      tenantId: tenant.tenantSlug,
      localId: count.localId
    });
    return ok(count);
  };

  const postInventoryCount: InventoryService["postInventoryCount"] = async (
    tenant,
    actor,
    inventoryCountLocalId
  ) => {
    const permissionResult = assertAdjustPermission(actor);
    if (!permissionResult.ok) {
      return err(permissionResult.error);
    }
    const existing = await db.getInventoryCountById(
      tenant.tenantSlug,
      inventoryCountLocalId
    );
    if (!existing) {
      return err(
        createAppError({
          code: "INVENTORY_COUNT_NOT_FOUND",
          message: "Conteo de inventario no encontrado.",
          retryable: false
        })
      );
    }
    if (existing.status !== "draft") {
      return err(
        createAppError({
          code: "INVENTORY_COUNT_INVALID_STATUS",
          message: "Solo se pueden postear conteos en estado draft.",
          retryable: false
        })
      );
    }

    const differenceQty = existing.countedQty - existing.expectedQty;
    const now = clock().toISOString();
    const posted: InventoryCount = {
      ...existing,
      status: "posted",
      differenceQty,
      countedAt: now,
      updatedAt: now,
      ...(actor.userId && { countedBy: actor.userId })
    };

    let movement: StockMovement | undefined;
    if (differenceQty !== 0) {
      const movementType =
        differenceQty > 0 ? "adjustment_in" : "adjustment_out";
      const balance = await db.getStockBalance(
        tenant.tenantSlug,
        existing.productLocalId,
        existing.warehouseLocalId
      );
      const projected = balance + differenceQty;
      if (projected < 0) {
        return err(
          createAppError({
            code: "NEGATIVE_STOCK_FORBIDDEN",
            message: "El ajuste por conteo genera stock negativo.",
            retryable: false,
            context: { balance, differenceQty }
          })
        );
      }

      movement = {
        localId: uuid(),
        tenantId: tenant.tenantSlug,
        productLocalId: existing.productLocalId,
        warehouseLocalId: existing.warehouseLocalId,
        movementType,
        quantity: Math.abs(differenceQty),
        referenceType: "inventory_count",
        referenceLocalId: existing.localId,
        createdAt: now,
        ...(existing.reason && { notes: existing.reason }),
        ...(actor.userId && { createdBy: actor.userId })
      };
    }

    const syncCountUpdate = await syncEngine.enqueue({
      id: uuid(),
      table: "inventory_counts",
      operation: "update",
      payload: {
        local_id: posted.localId,
        tenant_slug: tenant.tenantSlug,
        status: posted.status,
        difference_qty: posted.differenceQty,
        counted_by: posted.countedBy,
        counted_at: posted.countedAt,
        updated_at: posted.updatedAt
      },
      localId: posted.localId,
      tenantId: tenant.tenantSlug,
      createdAt: now,
      attempts: 0
    });
    if (!syncCountUpdate.ok) {
      return err(syncCountUpdate.error);
    }

    if (movement) {
      const syncMovement = await syncEngine.enqueue({
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
          notes: movement.notes,
          reference_type: movement.referenceType,
          reference_local_id: movement.referenceLocalId,
          created_by: movement.createdBy,
          created_at: movement.createdAt
        },
        localId: movement.localId,
        tenantId: tenant.tenantSlug,
        createdAt: now,
        attempts: 0
      });
      if (!syncMovement.ok) {
        return err(syncMovement.error);
      }
    }

    await db.postInventoryCount(
      tenant.tenantSlug,
      inventoryCountLocalId,
      posted,
      movement
    );

    if (movement) {
      eventBus.emit("INVENTORY.STOCK_MOVEMENT_RECORDED", {
        tenantId: tenant.tenantSlug,
        localId: movement.localId,
        productLocalId: movement.productLocalId,
        warehouseLocalId: movement.warehouseLocalId
      });
    }
    eventBus.emit("INVENTORY.COUNT_POSTED", {
      tenantId: tenant.tenantSlug,
      localId: posted.localId
    });
    return ok(posted);
  };

  const listInventoryCounts: InventoryService["listInventoryCounts"] = async (
    tenant
  ) => ok(await db.listInventoryCounts(tenant.tenantSlug));

  const getReorderSuggestions: InventoryService["getReorderSuggestions"] = async (
    tenant,
    actor,
    options
  ) => {
    const minStock = options?.minStock ?? 5;
    const targetStock = options?.targetStock ?? 15;
    if (targetStock <= minStock) {
      return err(
        createAppError({
          code: "REORDER_CONFIG_INVALID",
          message: "targetStock debe ser mayor a minStock.",
          retryable: false,
          context: { minStock, targetStock }
        })
      );
    }

    const movements = await db.listStockMovements(tenant.tenantSlug);
    const balances = new Map<string, number>();
    for (const item of movements) {
      if (actor.role === "employee") {
        const allowed = actor.permissions.allowedWarehouseLocalIds ?? [];
        if (!allowed.includes(item.warehouseLocalId)) {
          continue;
        }
      }
      const key = `${item.productLocalId}:${item.warehouseLocalId}`;
      const signed = incomingMovementTypes.has(item.movementType)
        ? item.quantity
        : -item.quantity;
      balances.set(key, (balances.get(key) ?? 0) + signed);
    }

    const suggestions: ReorderSuggestion[] = [];
    for (const [key, value] of balances.entries()) {
      if (value > minStock) {
        continue;
      }
      const parts = key.split(":");
      if (parts.length !== 2) {
        continue;
      }
      const productLocalId = parts[0] as string;
      const warehouseLocalId = parts[1] as string;
      suggestions.push({
        productLocalId,
        warehouseLocalId,
        currentStock: value,
        minStock,
        targetStock,
        suggestedOrderQty: Number(Math.max(targetStock - value, 1).toFixed(4))
      });
    }

    eventBus.emit("INVENTORY.REORDER_EVALUATED", {
      tenantId: tenant.tenantSlug,
      suggestions: suggestions.length
    });
    for (const item of suggestions) {
      eventBus.emit("INVENTORY.REORDER_SUGGESTED", {
        tenantId: tenant.tenantSlug,
        productLocalId: item.productLocalId,
        warehouseLocalId: item.warehouseLocalId,
        suggestedOrderQty: item.suggestedOrderQty
      });
    }
    return ok(suggestions);
  };

  return {
    createWarehouse,
    listWarehouses,
    createProductSizeColor,
    listProductSizeColors,
    recordStockMovement,
    listStockMovements,
    getStockBalance,
    createInventoryCount,
    postInventoryCount,
    listInventoryCounts,
    getReorderSuggestions
  };
};
