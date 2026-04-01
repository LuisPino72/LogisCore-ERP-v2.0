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
  CompleteProductionOrderInput,
  CreateProductionOrderInput,
  CreateRecipeInput,
  ProductionActorContext,
  ProductionLog,
  ProductionOrder,
  ProductionTenantContext,
  Recipe,
  RecipeIngredient,
  StartProductionOrderInput
} from "../types/production.types";

export interface ProductionDb {
  createRecipe(recipe: Recipe): Promise<void>;
  listRecipes(tenantId: string): Promise<Recipe[]>;
  getRecipeByLocalId(tenantId: string, recipeLocalId: string): Promise<Recipe | undefined>;
  createProductionOrder(order: ProductionOrder): Promise<void>;
  listProductionOrders(tenantId: string): Promise<ProductionOrder[]>;
  getProductionOrderByLocalId(
    tenantId: string,
    productionOrderLocalId: string
  ): Promise<ProductionOrder | undefined>;
  updateProductionOrder(
    tenantId: string,
    productionOrderLocalId: string,
    patch: Partial<ProductionOrder>
  ): Promise<void>;
  listProductionLogs(tenantId: string): Promise<ProductionLog[]>;
  completeOrderWithLogAndMovements(
    tenantId: string,
    productionOrderLocalId: string,
    orderPatch: Pick<ProductionOrder, "status" | "producedQty" | "completedAt" | "updatedAt">,
    log: ProductionLog,
    stockMovements: StockMovementRecord[]
  ): Promise<void>;
  getStockBalance(
    tenantId: string,
    productLocalId: string,
    warehouseLocalId: string
  ): Promise<number>;
}

export interface ProductionService {
  createRecipe(
    tenant: ProductionTenantContext,
    actor: ProductionActorContext,
    input: CreateRecipeInput
  ): Promise<Result<Recipe, AppError>>;
  createProductionOrder(
    tenant: ProductionTenantContext,
    actor: ProductionActorContext,
    input: CreateProductionOrderInput
  ): Promise<Result<ProductionOrder, AppError>>;
  startProductionOrder(
    tenant: ProductionTenantContext,
    actor: ProductionActorContext,
    input: StartProductionOrderInput
  ): Promise<Result<ProductionOrder, AppError>>;
  completeProductionOrder(
    tenant: ProductionTenantContext,
    actor: ProductionActorContext,
    input: CompleteProductionOrderInput
  ): Promise<Result<ProductionLog, AppError>>;
  listRecipes(tenant: ProductionTenantContext): Promise<Result<Recipe[], AppError>>;
  listProductionOrders(
    tenant: ProductionTenantContext
  ): Promise<Result<ProductionOrder[], AppError>>;
  listProductionLogs(
    tenant: ProductionTenantContext
  ): Promise<Result<ProductionLog[], AppError>>;
}

interface CreateProductionServiceDependencies {
  db: ProductionDb;
  syncEngine: SyncEngine;
  eventBus: EventBus;
  clock?: () => Date;
  uuid?: () => string;
}

export const createProductionService = ({
  db,
  syncEngine,
  eventBus,
  clock = () => new Date(),
  uuid = () => crypto.randomUUID()
}: CreateProductionServiceDependencies): ProductionService => {
  const assertWarehouseAccess = (
    actor: ProductionActorContext,
    warehouseLocalId: string
  ): Result<void, AppError> => {
    if (actor.role === "owner" || actor.role === "super_admin") {
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

  const scaledIngredients = (
    ingredients: RecipeIngredient[],
    yieldQty: number,
    plannedQty: number
  ): RecipeIngredient[] => {
    const factor = plannedQty / yieldQty;
    return ingredients.map((ingredient) => ({
      productLocalId: ingredient.productLocalId,
      requiredQty: Number((ingredient.requiredQty * factor).toFixed(4))
    }));
  };

  const createRecipe: ProductionService["createRecipe"] = async (
    tenant,
    _actor,
    input
  ) => {
    if (!input.productLocalId.trim() || !input.name.trim()) {
      return err(
        createAppError({
          code: "RECIPE_REQUIRED_FIELDS",
          message: "La receta requiere producto y nombre.",
          retryable: false
        })
      );
    }
    if (input.yieldQty <= 0 || !input.ingredients.length) {
      return err(
        createAppError({
          code: "RECIPE_INVALID",
          message: "La receta requiere rendimiento > 0 e ingredientes.",
          retryable: false
        })
      );
    }
    const invalidIngredient = input.ingredients.some(
      (item) => !item.productLocalId.trim() || item.requiredQty <= 0
    );
    if (invalidIngredient) {
      return err(
        createAppError({
          code: "RECIPE_INGREDIENT_INVALID",
          message: "Todos los ingredientes deben tener producto y cantidad > 0.",
          retryable: false
        })
      );
    }

    const now = clock().toISOString();
    const recipe: Recipe = {
      localId: uuid(),
      tenantId: tenant.tenantSlug,
      productLocalId: input.productLocalId,
      name: input.name.trim(),
      yieldQty: input.yieldQty,
      ingredients: input.ingredients,
      createdAt: now,
      updatedAt: now
    };

    const queue = await syncEngine.enqueue({
      id: uuid(),
      table: "recipes",
      operation: "create",
      payload: {
        local_id: recipe.localId,
        tenant_slug: tenant.tenantSlug,
        product_local_id: recipe.productLocalId,
        name: recipe.name,
        yield_qty: recipe.yieldQty,
        ingredients: recipe.ingredients,
        created_at: recipe.createdAt,
        updated_at: recipe.updatedAt
      },
      localId: recipe.localId,
      tenantId: tenant.tenantSlug,
      createdAt: now,
      attempts: 0
    });
    if (!queue.ok) {
      return err(queue.error);
    }

    await db.createRecipe(recipe);
    eventBus.emit("PRODUCTION.RECIPE_CREATED", {
      tenantId: tenant.tenantSlug,
      localId: recipe.localId
    });
    return ok(recipe);
  };

  const createProductionOrder: ProductionService["createProductionOrder"] = async (
    tenant,
    actor,
    input
  ) => {
    if (input.plannedQty <= 0) {
      return err(
        createAppError({
          code: "PRODUCTION_PLANNED_QTY_INVALID",
          message: "La cantidad planificada debe ser mayor a cero.",
          retryable: false
        })
      );
    }
    const warehouseAccess = assertWarehouseAccess(actor, input.warehouseLocalId);
    if (!warehouseAccess.ok) {
      return err(warehouseAccess.error);
    }
    const recipe = await db.getRecipeByLocalId(tenant.tenantSlug, input.recipeLocalId);
    if (!recipe) {
      return err(
        createAppError({
          code: "RECIPE_NOT_FOUND",
          message: "La receta indicada no existe.",
          retryable: false,
          context: { recipeLocalId: input.recipeLocalId }
        })
      );
    }

    const now = clock().toISOString();
    const order: ProductionOrder = {
      localId: uuid(),
      tenantId: tenant.tenantSlug,
      recipeLocalId: recipe.localId,
      warehouseLocalId: input.warehouseLocalId,
      plannedQty: input.plannedQty,
      status: "draft",
      createdAt: now,
      updatedAt: now,
      ...(actor.userId ? { createdBy: actor.userId } : {})
    };

    const queue = await syncEngine.enqueue({
      id: uuid(),
      table: "production_orders",
      operation: "create",
      payload: {
        local_id: order.localId,
        tenant_slug: tenant.tenantSlug,
        recipe_local_id: order.recipeLocalId,
        warehouse_local_id: order.warehouseLocalId,
        planned_qty: order.plannedQty,
        status: order.status,
        created_by: order.createdBy,
        created_at: order.createdAt,
        updated_at: order.updatedAt
      },
      localId: order.localId,
      tenantId: tenant.tenantSlug,
      createdAt: now,
      attempts: 0
    });
    if (!queue.ok) {
      return err(queue.error);
    }

    await db.createProductionOrder(order);
    eventBus.emit("PRODUCTION.ORDER_CREATED", {
      tenantId: tenant.tenantSlug,
      localId: order.localId,
      recipeLocalId: order.recipeLocalId,
      warehouseLocalId: order.warehouseLocalId
    });
    return ok(order);
  };

  const startProductionOrder: ProductionService["startProductionOrder"] = async (
    tenant,
    actor,
    input
  ) => {
    const order = await db.getProductionOrderByLocalId(
      tenant.tenantSlug,
      input.productionOrderLocalId
    );
    if (!order) {
      return err(
        createAppError({
          code: "PRODUCTION_ORDER_NOT_FOUND",
          message: "La orden de produccion no existe.",
          retryable: false,
          context: { productionOrderLocalId: input.productionOrderLocalId }
        })
      );
    }
    if (order.status !== "draft") {
      return err(
        createAppError({
          code: "PRODUCTION_ORDER_NOT_STARTABLE",
          message: "La orden no esta disponible para iniciar.",
          retryable: false,
          context: { productionOrderLocalId: input.productionOrderLocalId, status: order.status }
        })
      );
    }
    const warehouseAccess = assertWarehouseAccess(actor, order.warehouseLocalId);
    if (!warehouseAccess.ok) {
      return err(warehouseAccess.error);
    }

    const now = clock().toISOString();
    const queue = await syncEngine.enqueue({
      id: uuid(),
      table: "production_orders",
      operation: "update",
      payload: {
        local_id: order.localId,
        tenant_slug: tenant.tenantSlug,
        status: "in_progress",
        started_at: now,
        updated_at: now
      },
      localId: order.localId,
      tenantId: tenant.tenantSlug,
      createdAt: now,
      attempts: 0
    });
    if (!queue.ok) {
      return err(queue.error);
    }

    const startedOrder: ProductionOrder = {
      ...order,
      status: "in_progress",
      startedAt: now,
      updatedAt: now
    };
    await db.updateProductionOrder(tenant.tenantSlug, order.localId, {
      status: "in_progress",
      startedAt: now,
      updatedAt: now
    });
    eventBus.emit("PRODUCTION.STARTED", {
      tenantId: tenant.tenantSlug,
      localId: startedOrder.localId,
      warehouseLocalId: startedOrder.warehouseLocalId
    });
    return ok(startedOrder);
  };

  const completeProductionOrder: ProductionService["completeProductionOrder"] = async (
    tenant,
    actor,
    input
  ) => {
    const order = await db.getProductionOrderByLocalId(
      tenant.tenantSlug,
      input.productionOrderLocalId
    );
    if (!order) {
      return err(
        createAppError({
          code: "PRODUCTION_ORDER_NOT_FOUND",
          message: "La orden de produccion no existe.",
          retryable: false,
          context: { productionOrderLocalId: input.productionOrderLocalId }
        })
      );
    }
    if (order.status !== "in_progress") {
      return err(
        createAppError({
          code: "PRODUCTION_ORDER_NOT_COMPLETABLE",
          message: "La orden debe estar en progreso para completarse.",
          retryable: false,
          context: { productionOrderLocalId: input.productionOrderLocalId, status: order.status }
        })
      );
    }
    if (input.producedQty <= 0) {
      return err(
        createAppError({
          code: "PRODUCTION_PRODUCED_QTY_INVALID",
          message: "La cantidad producida debe ser mayor a cero.",
          retryable: false
        })
      );
    }
    const warehouseAccess = assertWarehouseAccess(actor, order.warehouseLocalId);
    if (!warehouseAccess.ok) {
      return err(warehouseAccess.error);
    }
    const recipe = await db.getRecipeByLocalId(tenant.tenantSlug, order.recipeLocalId);
    if (!recipe) {
      return err(
        createAppError({
          code: "RECIPE_NOT_FOUND",
          message: "No se encontro la receta asociada a la orden.",
          retryable: false,
          context: { recipeLocalId: order.recipeLocalId }
        })
      );
    }

    const ingredientsUsed = scaledIngredients(
      recipe.ingredients,
      recipe.yieldQty,
      order.plannedQty
    );

    for (const ingredient of ingredientsUsed) {
      const stock = await db.getStockBalance(
        tenant.tenantSlug,
        ingredient.productLocalId,
        order.warehouseLocalId
      );
      if (stock + 0.0001 < ingredient.requiredQty) {
        return err(
          createAppError({
            code: "PRODUCTION_STOCK_INSUFFICIENT",
            message: "Stock insuficiente para completar la orden de produccion.",
            retryable: false,
            context: {
              productLocalId: ingredient.productLocalId,
              stock,
              requiredQty: ingredient.requiredQty,
              warehouseLocalId: order.warehouseLocalId
            }
          })
        );
      }
    }

    const now = clock().toISOString();
    const variancePercent = Number(
      (((input.producedQty - order.plannedQty) / order.plannedQty) * 100).toFixed(4)
    );
    const productionLog: ProductionLog = {
      localId: uuid(),
      tenantId: tenant.tenantSlug,
      productionOrderLocalId: order.localId,
      recipeLocalId: recipe.localId,
      warehouseLocalId: order.warehouseLocalId,
      plannedQty: order.plannedQty,
      producedQty: input.producedQty,
      ingredientsUsed,
      variancePercent,
      createdAt: now,
      ...(actor.userId ? { createdBy: actor.userId } : {})
    };

    const stockMovements: StockMovementRecord[] = [
      ...ingredientsUsed.map((ingredient) => ({
        localId: uuid(),
        tenantId: tenant.tenantSlug,
        productLocalId: ingredient.productLocalId,
        warehouseLocalId: order.warehouseLocalId,
        movementType: "production_out" as const,
        quantity: ingredient.requiredQty,
        referenceType: "production_order",
        referenceLocalId: order.localId,
        notes: "Consumo por orden de produccion",
        createdAt: now,
        ...(actor.userId ? { createdBy: actor.userId } : {})
      })),
      {
        localId: uuid(),
        tenantId: tenant.tenantSlug,
        productLocalId: recipe.productLocalId,
        warehouseLocalId: order.warehouseLocalId,
        movementType: "production_in",
        quantity: input.producedQty,
        referenceType: "production_order",
        referenceLocalId: order.localId,
        notes: "Entrada de producto terminado por produccion",
        createdAt: now,
        ...(actor.userId ? { createdBy: actor.userId } : {})
      }
    ];

    const queueLog = await syncEngine.enqueue({
      id: uuid(),
      table: "production_logs",
      operation: "create",
      payload: {
        local_id: productionLog.localId,
        tenant_slug: tenant.tenantSlug,
        production_order_local_id: productionLog.productionOrderLocalId,
        recipe_local_id: productionLog.recipeLocalId,
        warehouse_local_id: productionLog.warehouseLocalId,
        planned_qty: productionLog.plannedQty,
        produced_qty: productionLog.producedQty,
        ingredients_used: productionLog.ingredientsUsed,
        variance_percent: productionLog.variancePercent,
        created_by: productionLog.createdBy,
        created_at: productionLog.createdAt
      },
      localId: productionLog.localId,
      tenantId: tenant.tenantSlug,
      createdAt: now,
      attempts: 0
    });
    if (!queueLog.ok) {
      return err(queueLog.error);
    }

    const queueOrder = await syncEngine.enqueue({
      id: uuid(),
      table: "production_orders",
      operation: "update",
      payload: {
        local_id: order.localId,
        tenant_slug: tenant.tenantSlug,
        status: "completed",
        produced_qty: input.producedQty,
        completed_at: now,
        updated_at: now
      },
      localId: order.localId,
      tenantId: tenant.tenantSlug,
      createdAt: now,
      attempts: 0
    });
    if (!queueOrder.ok) {
      return err(queueOrder.error);
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

    await db.completeOrderWithLogAndMovements(
      tenant.tenantSlug,
      order.localId,
      {
        status: "completed",
        producedQty: input.producedQty,
        completedAt: now,
        updatedAt: now
      },
      productionLog,
      stockMovements
    );

    eventBus.emit("PRODUCTION.COMPLETED", {
      tenantId: tenant.tenantSlug,
      localId: order.localId,
      productionLogLocalId: productionLog.localId,
      warehouseLocalId: order.warehouseLocalId
    });
    for (const movement of stockMovements) {
      eventBus.emit("INVENTORY.STOCK_MOVEMENT_RECORDED", {
        tenantId: tenant.tenantSlug,
        localId: movement.localId,
        productLocalId: movement.productLocalId,
        warehouseLocalId: movement.warehouseLocalId
      });
    }
    return ok(productionLog);
  };

  const listRecipes: ProductionService["listRecipes"] = async (tenant) =>
    ok(await db.listRecipes(tenant.tenantSlug));

  const listProductionOrders: ProductionService["listProductionOrders"] = async (
    tenant
  ) => ok(await db.listProductionOrders(tenant.tenantSlug));

  const listProductionLogs: ProductionService["listProductionLogs"] = async (tenant) =>
    ok(await db.listProductionLogs(tenant.tenantSlug));

  return {
    createRecipe,
    createProductionOrder,
    startProductionOrder,
    completeProductionOrder,
    listRecipes,
    listProductionOrders,
    listProductionLogs
  };
};
