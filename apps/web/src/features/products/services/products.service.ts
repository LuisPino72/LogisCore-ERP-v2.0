/**
 * Servicio principal para gestionar productos, categorías y presentaciones.
 * Implementa la lógica de negocio para todas las operaciones de productos.
 */

import { createAppError, err, ok, type AppError, type EventBus, type Result, type SyncEngine } from "@logiscore/core";
import type {
  Category,
  ProductsActorContext,
  CreateCategoryInput,
  CreateProductInput,
  CreateProductPresentationInput,
  CreateProductWithVariantsInput,
  CreateProductWithVariantsResult,
  UpdateCategoryInput,
  UpdateProductInput,
  UpdateProductPresentationInput,
  Product,
  ProductPresentation,
  ProductSizeColor,
  ProductsTenantContext,
  GlobalProductPresentation,
  ImportGlobalProductsResult
} from "../types/products.types";
import {
  validateProductInput,
  validateTenantForDexie,
  validatePresentationsBulk,
  validateProductSku,
} from "./products.validation";

interface RpcResultRow {
  success: boolean;
  code: string;
  message: string;
}

interface ProductsSupabaseRpcResult {
  rpc: <T>(fn: string, args?: Record<string, unknown>) => Promise<{
    data: T | null;
    error: { message: string } | null;
  }>;
}

interface ProductsSupabaseClient {
  rpc<T>(fn: string, args?: Record<string, unknown>): Promise<{
    data: T | null;
    error: Error | null;
  }>;
}

export type ProductsSupabaseLike = ProductsSupabaseRpcResult | ProductsSupabaseClient;

export interface ProductsDb {
  createCategory(category: Category): Promise<void>;
  createProduct(product: Product): Promise<void>;
  createPresentation(presentation: ProductPresentation): Promise<void>;
  createProductSizeColor(item: ProductSizeColor): Promise<void>;
  updateCategory(category: Category): Promise<void>;
  updateProduct(product: Product): Promise<void>;
  updatePresentation(presentation: ProductPresentation): Promise<void>;
  listCategories(tenantId: string): Promise<Category[]>;
  listProducts(tenantId: string): Promise<Product[]>;
  listActiveProducts(tenantId: string): Promise<Product[]>;
  listPresentations(tenantId: string): Promise<ProductPresentation[]>;
  listProductSizeColors(tenantId: string): Promise<ProductSizeColor[]>;
  softDeleteCategory(
    localId: string,
    tenantId: string,
    deletedAt: string
  ): Promise<void>;
  softDeleteProduct(
    localId: string,
    tenantId: string,
    deletedAt: string
  ): Promise<void>;
  countActiveProductsByCategory(localId: string, tenantId: string): Promise<number>;
  countActivePresentationsByProduct(
    productLocalId: string,
    tenantId: string
  ): Promise<number>;
  countActiveProducts(tenantId: string): Promise<number>;
  getProductById(localId: string, tenantId: string): Promise<Product | null>;
  getCategoryById(localId: string, tenantId: string): Promise<Category | null>;
  getPresentationById(
    id: string,
    tenantId: string
  ): Promise<ProductPresentation | null>;
}

export interface ProductsService {
  createCategory(
    tenant: ProductsTenantContext,
    actor: ProductsActorContext,
    input: CreateCategoryInput
  ): Promise<Result<Category, AppError>>;
  createProduct(
    tenant: ProductsTenantContext,
    actor: ProductsActorContext,
    input: CreateProductInput
  ): Promise<Result<Product, AppError>>;
  createProductWithVariants(
    tenant: ProductsTenantContext,
    actor: ProductsActorContext,
    input: CreateProductWithVariantsInput
  ): Promise<Result<CreateProductWithVariantsResult, AppError>>;
  createPresentation(
    tenant: ProductsTenantContext,
    actor: ProductsActorContext,
    input: CreateProductPresentationInput
  ): Promise<Result<ProductPresentation, AppError>>;
  listCategories(tenant: ProductsTenantContext): Promise<Result<Category[], AppError>>;
  listProducts(tenant: ProductsTenantContext): Promise<Result<Product[], AppError>>;
  updateCategory(
    tenant: ProductsTenantContext,
    actor: ProductsActorContext,
    input: UpdateCategoryInput
  ): Promise<Result<Category, AppError>>;
  updateProduct(
    tenant: ProductsTenantContext,
    actor: ProductsActorContext,
    input: UpdateProductInput
  ): Promise<Result<Product, AppError>>;
  listPresentations(
    tenant: ProductsTenantContext
  ): Promise<Result<ProductPresentation[], AppError>>;
  updatePresentation(
    tenant: ProductsTenantContext,
    actor: ProductsActorContext,
    input: UpdateProductPresentationInput
  ): Promise<Result<ProductPresentation, AppError>>;
  deleteCategory(
    tenant: ProductsTenantContext,
    actor: ProductsActorContext,
    categoryLocalId: string
  ): Promise<Result<void, AppError>>;
  deleteProduct(
    tenant: ProductsTenantContext,
    actor: ProductsActorContext,
    productLocalId: string
  ): Promise<Result<void, AppError>>;
  importGlobalProducts(
    tenant: ProductsTenantContext,
    globalProducts: Array<{
      id: string;
      name: string;
      sku: string;
      description?: string;
      categoryId?: string;
      isWeighted: boolean;
      unitOfMeasure: string;
      isTaxable: boolean;
      isSerialized: boolean;
      weight?: number;
      length?: number;
      width?: number;
      height?: number;
      visible: boolean;
      presentations: GlobalProductPresentation[];
    }>
  ): Promise<Result<ImportGlobalProductsResult, AppError>>;
}

interface ProductsServiceDependencies {
  db: ProductsDb;
  syncEngine: SyncEngine;
  eventBus: EventBus;
  supabase: ProductsSupabaseLike | null;
  clock?: () => Date;
  uuid?: () => string;
}

export const createProductsService = ({
  db,
  syncEngine,
  eventBus,
  supabase,
  clock = () => new Date(),
  uuid = () => crypto.randomUUID()
}: ProductsServiceDependencies): ProductsService => {
  const assertCatalogPermissions = (
    actor: ProductsActorContext
  ): Result<void, AppError> => {
    const allowedByRole = actor.role === "owner" || actor.role === "admin";
    const allowedByPermission =
      actor.permissions.canAdjustStock || actor.permissions.canApplyCustomPrice;
    if (!allowedByRole && !allowedByPermission) {
      return err(
        createAppError({
          code: "CATALOG_PERMISSION_DENIED",
          message:
            "El usuario no tiene permisos para gestionar catalogo de productos.",
          retryable: false
        })
      );
    }
    return ok<void>(undefined);
  };

  const checkProductQuota = async (
    tenant: ProductsTenantContext,
    additionalProducts: number = 1
  ): Promise<Result<number, AppError>> => {
    const maxProducts = tenant.maxProducts;
    if (!maxProducts || maxProducts <= 0) {
      return ok(0);
    }

    const currentCount = await db.countActiveProducts(tenant.tenantSlug);
    const newCount = currentCount + additionalProducts;

    if (newCount > maxProducts) {
      eventBus.emit("SECURITY.AUDIT_LOG_CREATED", {
        eventType: "PLAN_PRODUCT_LIMIT_EXCEEDED",
        tenantId: tenant.tenantSlug,
        details: {
          currentCount,
          maxProducts,
          additionalProducts,
          action: "createProduct"
        }
      });

      return err(
        createAppError({
          code: "ADMIN_PLAN_PRODUCT_LIMIT_EXCEEDED",
          message: `Ha alcanzado el límite de productos de su plan (${maxProducts}). Para crear más productos, actualice a un plan superior.`,
          retryable: false,
          context: { current: currentCount, limit: maxProducts }
        })
      );
    }

    return ok(maxProducts - newCount);
  };

  const createCategory: ProductsService["createCategory"] = async (
    tenant,
    actor,
    input
  ) => {
    const permissionResult = assertCatalogPermissions(actor);
    if (!permissionResult.ok) {
      return err(permissionResult.error);
    }

    if (!input.name.trim()) {
      return err(
        createAppError({
          code: "CATEGORY_NAME_REQUIRED",
          message: "El nombre de la categoria es obligatorio.",
          retryable: false
        })
      );
    }

    if (input.sourceModule !== "purchases") {
      return err(
        createAppError({
          code: "CATEGORY_CREATION_FORBIDDEN_MODULE",
          message:
            "Las categorias solo se crean desde el modulo Compras (regla 7.5).",
          retryable: false
        })
      );
    }

    const now = clock().toISOString();
    const category: Category = {
      localId: uuid(),
      tenantId: tenant.tenantSlug,
      name: input.name.trim(),
      createdAt: now,
      updatedAt: now
    };

    const syncResult = await syncEngine.enqueue({
      id: uuid(),
      table: "categories",
      operation: "create",
      payload: {
        local_id: category.localId,
        tenant_slug: tenant.tenantSlug,
        name: category.name,
        created_at: category.createdAt,
        updated_at: category.updatedAt
      },
      localId: category.localId,
      tenantId: tenant.tenantSlug,
      createdAt: now,
      attempts: 0
    });
    if (!syncResult.ok) {
      return err(syncResult.error);
    }

    await db.createCategory(category);
    eventBus.emit("CATEGORY.CREATED", {
      tenantId: tenant.tenantSlug,
      localId: category.localId
    });
    return ok(category);
  };

  const createProduct: ProductsService["createProduct"] = async (
    tenant,
    actor,
    input
  ) => {
    const permissionResult = assertCatalogPermissions(actor);
    if (!permissionResult.ok) {
      return err(permissionResult.error);
    }

    const tenantValidation = validateTenantForDexie(tenant.tenantSlug);
    if (!tenantValidation.ok) {
      return err(tenantValidation.error);
    }

    if (input.sourceModule !== "purchases") {
      return err(
        createAppError({
          code: "PRODUCT_CREATION_FORBIDDEN_MODULE",
          message:
            "Los productos solo se crean desde el modulo Compras (regla 7.5).",
          retryable: false
        })
      );
    }

    const validationResult = validateProductInput(input);
    if (!validationResult.ok) {
      return err(validationResult.error);
    }

    const skuValidation = validateProductSku(input.sku);
    if (!skuValidation.ok) {
      return err(skuValidation.error);
    }

    if (!input.name.trim()) {
      return err(
        createAppError({
          code: "PRODUCT_NAME_REQUIRED",
          message: "El nombre del producto es obligatorio.",
          retryable: false
        })
      );
    }

    const quotaResult = await checkProductQuota(tenant, 1);
    if (!quotaResult.ok) {
      return err(quotaResult.error);
    }

    if (input.categoryId) {
      const category = await db.getCategoryById(input.categoryId, tenant.tenantSlug);
      if (!category) {
        return err(
          createAppError({
            code: "PRODUCT_CATEGORY_NOT_FOUND",
            message: "La categoria del producto no existe para el tenant actual.",
            retryable: false,
            context: { categoryId: input.categoryId }
          })
        );
      }
    }

    if (input.defaultPresentationId) {
      return err(
        createAppError({
          code: "PRODUCT_DEFAULT_PRESENTATION_REQUIRES_EXISTING_PRODUCT",
          message:
            "No se puede definir presentacion por defecto al crear producto; actualice el producto luego de crear presentaciones.",
          retryable: false
        })
      );
    }

    const now = clock().toISOString();
    const product: Product = {
      localId: uuid(),
      tenantId: tenant.tenantSlug,
      name: input.name.trim(),
      description: input.description ?? null,
      categoryId: input.categoryId ?? null,
      sku: input.sku,
      weight: input.weight ?? null,
      length: input.length ?? null,
      width: input.width ?? null,
      height: input.height ?? null,
      isSerialized: input.isSerialized ?? null,
      isTaxable: input.isTaxable ?? null,
      isWeighted: input.isWeighted ?? false,
      unitOfMeasure: input.unitOfMeasure ?? 'unidad',
      visible: input.visible,
      defaultPresentationId: input.defaultPresentationId ?? null,
      createdAt: now,
      updatedAt: now
    };

    const syncResult = await syncEngine.enqueue({
      id: uuid(),
      table: "products",
      operation: "create",
      payload: {
        local_id: product.localId,
        tenant_slug: tenant.tenantSlug,
        name: product.name,
        description: product.description,
        sku: product.sku,
        weight: product.weight,
        length: product.length,
        width: product.width,
        height: product.height,
        is_serialized: product.isSerialized,
        is_taxable: product.isTaxable,
        is_weighted: product.isWeighted ?? false,
        unit_of_measure: product.unitOfMeasure ?? 'unidad',
        category_id: product.categoryId,
        visible: product.visible,
        default_presentation_id: product.defaultPresentationId,
        created_at: product.createdAt,
        updated_at: product.updatedAt
      },
      localId: product.localId,
      tenantId: tenant.tenantSlug,
      createdAt: now,
      attempts: 0
    });
    if (!syncResult.ok) {
      return err(syncResult.error);
    }

    await db.createProduct(product);
    eventBus.emit("PRODUCT.CREATED", {
      tenantId: tenant.tenantSlug,
      localId: product.localId,
      visible: product.visible
    });
    return ok(product);
  };

  const updateCategory: ProductsService["updateCategory"] = async (
    tenant,
    actor,
    input
  ) => {
    const permissionResult = assertCatalogPermissions(actor);
    if (!permissionResult.ok) {
      return err(permissionResult.error);
    }

    const existing = await db.getCategoryById(input.localId, tenant.tenantSlug);
    if (!existing) {
      return err(
        createAppError({
          code: "CATEGORY_NOT_FOUND",
          message: "Categoria no encontrada para el tenant actual.",
          retryable: false,
          context: { localId: input.localId }
        })
      );
    }

    const now = clock().toISOString();
    const updated: Category = {
      ...existing,
      name: input.name.trim(),
      updatedAt: now
    };

    const syncResult = await syncEngine.enqueue({
      id: uuid(),
      table: "categories",
      operation: "update",
      payload: {
        local_id: updated.localId,
        tenant_slug: tenant.tenantSlug,
        name: updated.name,
        updated_at: updated.updatedAt
      },
      localId: updated.localId,
      tenantId: tenant.tenantSlug,
      createdAt: now,
      attempts: 0
    });
    if (!syncResult.ok) {
      return err(syncResult.error);
    }

    await db.updateCategory(updated);
    eventBus.emit("CATEGORY.UPDATED", {
      tenantId: tenant.tenantSlug,
      localId: updated.localId
    });
    return ok(updated);
  };

  const updateProduct: ProductsService["updateProduct"] = async (
    tenant,
    actor,
    input
  ) => {
    const permissionResult = assertCatalogPermissions(actor);
    if (!permissionResult.ok) {
      return err(permissionResult.error);
    }

    const existing = await db.getProductById(input.localId, tenant.tenantSlug);
    if (!existing) {
      return err(
        createAppError({
          code: "PRODUCT_NOT_FOUND",
          message: "Producto no encontrado para el tenant actual.",
          retryable: false,
          context: { localId: input.localId }
        })
      );
    }

    if (input.categoryId) {
      const category = await db.getCategoryById(input.categoryId, tenant.tenantSlug);
      if (!category) {
        return err(
          createAppError({
            code: "PRODUCT_CATEGORY_NOT_FOUND",
            message: "La categoria del producto no existe para el tenant actual.",
            retryable: false,
            context: { categoryId: input.categoryId }
          })
        );
      }
    }

    if (input.defaultPresentationId) {
      const presentation = await db.getPresentationById(
        input.defaultPresentationId,
        tenant.tenantSlug
      );
      if (!presentation) {
        return err(
          createAppError({
            code: "PRODUCT_DEFAULT_PRESENTATION_NOT_FOUND",
            message: "La presentacion por defecto no existe para el tenant actual.",
            retryable: false,
            context: { defaultPresentationId: input.defaultPresentationId }
          })
        );
      }
      if (presentation.productLocalId !== existing.localId) {
        return err(
          createAppError({
            code: "PRODUCT_DEFAULT_PRESENTATION_MISMATCH",
            message:
              "La presentacion por defecto no pertenece al producto actual.",
            retryable: false,
            context: { defaultPresentationId: input.defaultPresentationId }
          })
        );
      }
    }

    const now = clock().toISOString();
    const updated = {
      ...existing,
      name: input.name.trim(),
      description: input.description ?? existing.description,
      categoryId: input.categoryId ?? existing.categoryId,
      sku: input.sku ?? existing.sku,
      weight: input.weight ?? existing.weight,
      length: input.length ?? existing.length,
      width: input.width ?? existing.width,
      height: input.height ?? existing.height,
      isSerialized: input.isSerialized ?? existing.isSerialized,
      isTaxable: input.isTaxable ?? existing.isTaxable,
      isWeighted: input.isWeighted ?? existing.isWeighted ?? false,
      unitOfMeasure: input.unitOfMeasure ?? existing.unitOfMeasure ?? 'unidad',
      visible: input.visible,
      updatedAt: now,
      ...(input.defaultPresentationId !== undefined && { defaultPresentationId: input.defaultPresentationId })
    } as Product;

    const syncResult = await syncEngine.enqueue({
      id: uuid(),
      table: "products",
      operation: "update",
      payload: {
        local_id: updated.localId,
        tenant_slug: tenant.tenantSlug,
        name: updated.name,
        description: updated.description,
        sku: updated.sku,
        weight: updated.weight,
        length: updated.length,
        width: updated.width,
        height: updated.height,
        is_serialized: updated.isSerialized,
        is_taxable: updated.isTaxable,
        is_weighted: updated.isWeighted ?? false,
        unit_of_measure: updated.unitOfMeasure ?? 'unidad',
        category_id: updated.categoryId,
        visible: updated.visible,
        default_presentation_id: updated.defaultPresentationId,
        updated_at: updated.updatedAt
      },
      localId: updated.localId,
      tenantId: tenant.tenantSlug,
      createdAt: now,
      attempts: 0
    });
    if (!syncResult.ok) {
      return err(syncResult.error);
    }

    await db.updateProduct(updated);
    eventBus.emit("PRODUCT.UPDATED", {
      tenantId: tenant.tenantSlug,
      localId: updated.localId
    });
    return ok(updated);
  };

  const createPresentation: ProductsService["createPresentation"] = async (
    tenant,
    actor,
    input
  ) => {
    const permissionResult = assertCatalogPermissions(actor);
    if (!permissionResult.ok) {
      return err(permissionResult.error);
    }

    if (!input.name.trim()) {
      return err(
        createAppError({
          code: "PRESENTATION_NAME_REQUIRED",
          message: "El nombre de la presentacion es obligatorio.",
          retryable: false
        })
      );
    }
    if (input.factor <= 0) {
      return err(
        createAppError({
          code: "PRESENTATION_FACTOR_INVALID",
          message: "El factor de presentacion debe ser mayor a 0.",
          retryable: false
        })
      );
    }

    const product = await db.getProductById(input.productLocalId, tenant.tenantSlug);
    if (!product) {
      return err(
        createAppError({
          code: "PRESENTATION_PRODUCT_NOT_FOUND",
          message: "El producto de la presentacion no existe para el tenant actual.",
          retryable: false,
          context: { productLocalId: input.productLocalId }
        })
      );
    }

    const now = clock().toISOString();
    const presentation = {
      id: uuid(),
      tenantId: tenant.tenantSlug,
      productLocalId: input.productLocalId,
      name: input.name.trim(),
      factor: input.factor,
      price: input.price ?? 0,
      createdAt: now,
      updatedAt: now,
      ...(input.barcode !== undefined && { barcode: input.barcode }),
      ...(input.isDefault !== undefined && { isDefault: input.isDefault })
    };

    await db.createPresentation(presentation);
    eventBus.emit("PRESENTATION.CREATED", {
      tenantId: tenant.tenantSlug,
      id: presentation.id,
      productLocalId: input.productLocalId
    });
    return ok(presentation);
  };

  const listCategories: ProductsService["listCategories"] = async (tenant) => {
    const categories = await db.listCategories(tenant.tenantSlug);
    return ok(categories);
  };

  const listProducts: ProductsService["listProducts"] = async (tenant) => {
    const products = await db.listProducts(tenant.tenantSlug);
    return ok(products);
  };

  const listPresentations: ProductsService["listPresentations"] = async (tenant) => {
    const presentations = await db.listPresentations(tenant.tenantSlug);
    return ok(presentations);
  };

  const deleteCategory: ProductsService["deleteCategory"] = async (
    tenant,
    actor,
    categoryLocalId
  ) => {
    const permissionResult = assertCatalogPermissions(actor);
    if (!permissionResult.ok) {
      return err(permissionResult.error);
    }

    const refs = await db.countActiveProductsByCategory(
      categoryLocalId,
      tenant.tenantSlug
    );
    if (refs > 0) {
      return err(
        createAppError({
          code: "CATEGORY_DELETE_BLOCKED_REFERENCES",
          message:
            "No se puede eliminar la categoria porque tiene productos activos.",
          retryable: false,
          context: { categoryLocalId, references: refs }
        })
      );
    }

    if (!supabase) {
      return err(
        createAppError({
          code: "CATEGORY_DELETE_NO_CONNECTION",
          message: "No hay conexión a Supabase.",
          retryable: true,
          context: { categoryLocalId, tenantSlug: tenant.tenantSlug }
        })
      );
    }

    const rpcResponse = await supabase.rpc<RpcResultRow[]>("secure_soft_delete_category", {
      p_local_id: categoryLocalId
    });

    if (rpcResponse.error) {
      return err(
        createAppError({
          code: "CATEGORY_DELETE_RPC_FAILED",
          message: rpcResponse.error.message,
          retryable: true,
          context: { categoryLocalId, tenantSlug: tenant.tenantSlug }
        })
      );
    }

    const rpcResult = Array.isArray(rpcResponse.data)
      ? rpcResponse.data[0]
      : null;

    if (!rpcResult?.success) {
      return err(
        createAppError({
          code: rpcResult?.code ?? "CATEGORY_DELETE_REJECTED",
          message:
            rpcResult?.message ??
            "No se pudo ejecutar borrado logico seguro para la categoria.",
          retryable: false,
          context: { categoryLocalId, tenantSlug: tenant.tenantSlug }
        })
      );
    }

    const now = clock().toISOString();
    await db.softDeleteCategory(categoryLocalId, tenant.tenantSlug, now);
    eventBus.emit("CATEGORY.DELETED", {
      tenantId: tenant.tenantSlug,
      localId: categoryLocalId
    });
    return ok<void>(undefined);
  };

  const deleteProduct: ProductsService["deleteProduct"] = async (
    tenant,
    actor,
    productLocalId
  ) => {
    const permissionResult = assertCatalogPermissions(actor);
    if (!permissionResult.ok) {
      return err(permissionResult.error);
    }

    const refs = await db.countActivePresentationsByProduct(
      productLocalId,
      tenant.tenantSlug
    );
    if (refs > 0) {
      return err(
        createAppError({
          code: "PRODUCT_DELETE_BLOCKED_REFERENCES",
          message:
            "No se puede eliminar el producto porque tiene presentaciones activas.",
          retryable: false,
          context: { productLocalId, references: refs }
        })
      );
    }

    if (!supabase) {
      return err(
        createAppError({
          code: "PRODUCT_DELETE_NO_CONNECTION",
          message: "No hay conexión a Supabase.",
          retryable: true,
          context: { productLocalId, tenantSlug: tenant.tenantSlug }
        })
      );
    }

    const rpcResponse = await supabase.rpc<RpcResultRow[]>("secure_soft_delete_product", {
      p_local_id: productLocalId
    });

    if (rpcResponse.error) {
      return err(
        createAppError({
          code: "PRODUCT_DELETE_RPC_FAILED",
          message: rpcResponse.error.message,
          retryable: true,
          context: { productLocalId, tenantSlug: tenant.tenantSlug }
        })
      );
    }

    const rpcResult = Array.isArray(rpcResponse.data)
      ? rpcResponse.data[0]
      : null;

    if (!rpcResult?.success) {
      return err(
        createAppError({
          code: rpcResult?.code ?? "PRODUCT_DELETE_REJECTED",
          message:
            rpcResult?.message ??
            "No se pudo ejecutar borrado logico seguro para el producto.",
          retryable: false,
          context: { productLocalId, tenantSlug: tenant.tenantSlug }
        })
      );
    }

    const now = clock().toISOString();
    await db.softDeleteProduct(productLocalId, tenant.tenantSlug, now);
    eventBus.emit("PRODUCT.DELETED", {
      tenantId: tenant.tenantSlug,
      localId: productLocalId
    });
    return ok<void>(undefined);
  };

  const updatePresentation: ProductsService["updatePresentation"] = async (
    tenant,
    actor,
    input
  ) => {
    const permissionResult = assertCatalogPermissions(actor);
    if (!permissionResult.ok) {
      return err(permissionResult.error);
    }

    const existing = await db.getPresentationById(input.id, tenant.tenantSlug);
    if (!existing) {
      return err(
        createAppError({
          code: "PRESENTATION_NOT_FOUND",
          message: "Presentacion no encontrada para el tenant actual.",
          retryable: false,
          context: { id: input.id }
        })
      );
    }

    if (input.factor <= 0) {
      return err(
        createAppError({
          code: "PRESENTATION_FACTOR_INVALID",
          message: "El factor de presentacion debe ser mayor a 0.",
          retryable: false
        })
      );
    }

    const now = clock().toISOString();
    const updated = {
      ...existing,
      name: input.name.trim(),
      factor: input.factor,
      updatedAt: now,
      ...(input.barcode !== undefined && { barcode: input.barcode }),
      ...(input.isDefault !== undefined && { isDefault: input.isDefault })
    };

    const syncResult = await syncEngine.enqueue({
      id: uuid(),
      table: "product_presentations",
      operation: "update",
      payload: {
        id: updated.id,
        tenant_slug: tenant.tenantSlug,
        product_local_id: updated.productLocalId,
        name: updated.name,
        factor: updated.factor,
        barcode: updated.barcode,
        is_default: updated.isDefault,
        created_at: updated.createdAt,
        updated_at: updated.updatedAt
      },
      localId: updated.id,
      tenantId: tenant.tenantSlug,
      createdAt: now,
      attempts: 0
    });
    if (!syncResult.ok) {
      return err(syncResult.error);
    }

    await db.updatePresentation(updated);
    eventBus.emit("PRESENTATION.UPDATED", {
      tenantId: tenant.tenantSlug,
      id: updated.id,
      productLocalId: updated.productLocalId
    });
    return ok(updated);
  };

  const createProductWithVariants: ProductsService["createProductWithVariants"] = async (
    tenant,
    actor,
    input
  ) => {
    const permissionResult = assertCatalogPermissions(actor);
    if (!permissionResult.ok) {
      return err(permissionResult.error);
    }

    const tenantValidation = validateTenantForDexie(tenant.tenantSlug);
    if (!tenantValidation.ok) {
      return err(tenantValidation.error);
    }

    const validationResult = validateProductInput(input);
    if (!validationResult.ok) {
      return err(validationResult.error);
    }

    const skuValidation = validateProductSku(input.sku);
    if (!skuValidation.ok) {
      return err(skuValidation.error);
    }

    if (input.presentations && input.presentations.length > 0) {
      const presentationsValidation = validatePresentationsBulk(input.presentations);
      if (!presentationsValidation.ok) {
        return err(presentationsValidation.error);
      }
    }

    if (!input.name.trim()) {
      return err(
        createAppError({
          code: "PRODUCT_NAME_REQUIRED",
          message: "El nombre del producto es obligatorio.",
          retryable: false
        })
      );
    }

    const quotaResult = await checkProductQuota(tenant, 1);
    if (!quotaResult.ok) {
      return err(quotaResult.error);
    }

    if (input.sourceModule !== "purchases") {
      return err(
        createAppError({
          code: "PRODUCT_CREATION_FORBIDDEN_MODULE",
          message:
            "Los productos solo se crean desde el modulo Compras (regla 7.5).",
          retryable: false
        })
      );
    }

    if (input.categoryId) {
      const category = await db.getCategoryById(input.categoryId, tenant.tenantSlug);
      if (!category) {
        return err(
          createAppError({
            code: "PRODUCT_CATEGORY_NOT_FOUND",
            message: "La categoria del producto no existe para el tenant actual.",
            retryable: false,
            context: { categoryId: input.categoryId }
          })
        );
      }
    }

    const presentations = input.presentations ?? [];
    if (presentations.length > 0) {
      const defaultCount = presentations.filter(p => p?.isDefault).length;
      if (defaultCount > 1) {
        return err(
          createAppError({
            code: "VARIANT_MULTIPLE_DEFAULT_PRESENTATIONS",
            message: "Solo puede haber una presentacion por defecto.",
            retryable: false
          })
        );
      }
      for (let i = 0; i < presentations.length; i++) {
        const p = presentations[i];
        if (!p || !p.name.trim()) {
          return err(
            createAppError({
              code: "PRESENTATION_NAME_REQUIRED",
              message: `El nombre de la presentacion ${i + 1} es obligatorio.`,
              retryable: false
            })
          );
        }
        if (p.factor <= 0) {
          return err(
            createAppError({
              code: "PRESENTATION_FACTOR_INVALID",
              message: `El factor de la presentacion ${i + 1} debe ser mayor a 0.`,
              retryable: false
            })
          );
        }
      }
    }

    const sizeColors = input.sizeColors ?? [];
    for (let i = 0; i < sizeColors.length; i++) {
      const sc = sizeColors[i];
      if (!sc || (!sc.size?.trim() && !sc.color?.trim())) {
        return err(
          createAppError({
            code: "SIZE_COLOR_AT_LEAST_ONE_REQUIRED",
            message: `La variante ${i + 1} debe tener al menos talla o color.`,
            retryable: false
          })
        );
      }
    }

    const now = clock().toISOString();
    const productLocalId = uuid();

    const product: Product = {
      localId: productLocalId,
      tenantId: tenant.tenantSlug,
      name: input.name.trim(),
      description: input.description ?? null,
      categoryId: input.categoryId ?? null,
      sku: input.sku,
      weight: input.weight ?? null,
      length: input.length ?? null,
      width: input.width ?? null,
      height: input.height ?? null,
      isSerialized: input.isSerialized ?? null,
      isTaxable: input.isTaxable ?? null,
      isWeighted: input.isWeighted ?? false,
      unitOfMeasure: input.unitOfMeasure ?? 'unidad',
      visible: input.visible,
      defaultPresentationId: null,
      createdAt: now,
      updatedAt: now
    };

    const createdPresentations: ProductPresentation[] = [];
    const createdSizeColors: ProductSizeColor[] = [];

    const syncPayloads: Array<{ table: string; operation: string; payload: Record<string, unknown> }> = [];

    syncPayloads.push({
      table: "products",
      operation: "create",
      payload: {
        local_id: product.localId,
        tenant_slug: tenant.tenantSlug,
        name: product.name,
        description: product.description,
        sku: product.sku,
        weight: product.weight,
        length: product.length,
        width: product.width,
        height: product.height,
        is_serialized: product.isSerialized,
        is_taxable: product.isTaxable,
        is_weighted: product.isWeighted ?? false,
        unit_of_measure: product.unitOfMeasure ?? 'unidad',
        category_id: product.categoryId,
        visible: product.visible,
        default_presentation_id: product.defaultPresentationId,
        created_at: product.createdAt,
        updated_at: product.updatedAt
      }
    });

    let defaultPresentationId: string | null = null;

    for (const pInput of presentations) {
      const presId = uuid();
      const isDefault = pInput.isDefault ?? false;
      if (isDefault) {
        defaultPresentationId = presId;
      }

      const presentation: ProductPresentation = {
        id: presId,
        tenantId: tenant.tenantSlug,
        productLocalId: productLocalId,
        name: pInput.name.trim(),
        factor: pInput.factor,
        price: pInput.price ?? 0,
        createdAt: now,
        updatedAt: now,
        ...(pInput.barcode && { barcode: pInput.barcode }),
        ...(pInput.isDefault !== undefined && { isDefault })
      };
      createdPresentations.push(presentation);

      syncPayloads.push({
        table: "product_presentations",
        operation: "create",
        payload: {
          id: presentation.id,
          tenant_slug: tenant.tenantSlug,
          product_local_id: presentation.productLocalId,
          name: presentation.name,
          factor: presentation.factor,
          price: presentation.price,
          barcode: presentation.barcode,
          is_default: presentation.isDefault,
          created_at: presentation.createdAt,
          updated_at: presentation.updatedAt
        }
      });
    }

    for (const scInput of sizeColors) {
      const scLocalId = uuid();
      const sizeColor: ProductSizeColor = {
        localId: scLocalId,
        tenantId: tenant.tenantSlug,
        productLocalId: productLocalId,
        createdAt: now,
        updatedAt: now,
        ...(scInput.size?.trim() && { size: scInput.size.trim() }),
        ...(scInput.color?.trim() && { color: scInput.color.trim() }),
        ...(scInput.skuSuffix?.trim() && { skuSuffix: scInput.skuSuffix.trim() }),
        ...(scInput.barcode?.trim() && { barcode: scInput.barcode.trim() })
      };
      createdSizeColors.push(sizeColor);

      syncPayloads.push({
        table: "product_size_colors",
        operation: "create",
        payload: {
          local_id: sizeColor.localId,
          tenant_slug: tenant.tenantSlug,
          product_local_id: sizeColor.productLocalId,
          size: sizeColor.size,
          color: sizeColor.color,
          sku_suffix: sizeColor.skuSuffix,
          barcode: sizeColor.barcode,
          created_at: sizeColor.createdAt,
          updated_at: sizeColor.updatedAt
        }
      });
    }

    if (defaultPresentationId && syncPayloads.length > 0) {
      product.defaultPresentationId = defaultPresentationId;
      syncPayloads[0]!.payload.default_presentation_id = defaultPresentationId;
    }

    for (const syncItem of syncPayloads) {
      const syncResult = await syncEngine.enqueue({
        id: uuid(),
        table: syncItem.table,
        operation: syncItem.operation as "create" | "update" | "delete",
        payload: syncItem.payload,
        localId: syncItem.table === "products" ? productLocalId : (syncItem.payload.local_id ?? syncItem.payload.id) as string,
        tenantId: tenant.tenantSlug,
        createdAt: now,
        attempts: 0
      });
      if (!syncResult.ok) {
        return err(syncResult.error);
      }
    }

    await db.createProduct(product);
    for (const pres of createdPresentations) {
      await db.createPresentation(pres);
    }
    for (const sc of createdSizeColors) {
      await db.createProductSizeColor(sc);
    }

    eventBus.emit("PRODUCT.CREATED", {
      tenantId: tenant.tenantSlug,
      localId: productLocalId,
      visible: product.visible,
      variantsCount: createdPresentations.length + createdSizeColors.length
    });

    return ok({
      product,
      presentations: createdPresentations,
      sizeColors: createdSizeColors
    });
  };

  const importGlobalProducts: ProductsService["importGlobalProducts"] = async (
    tenant,
    globalProducts
  ) => {
    const validation = validateTenantForDexie(tenant.tenantSlug);
    if (!validation.ok) return err(validation.error);

    const maxProducts = tenant.maxProducts;
    if (maxProducts && maxProducts > 0) {
      const currentCount = await db.countActiveProducts(tenant.tenantSlug);
      const productsToImport = globalProducts.length;
      
      if (currentCount + productsToImport > maxProducts) {
        return err(
          createAppError({
            code: "ADMIN_PLAN_PRODUCT_LIMIT_EXCEEDED",
            message: `La importación de ${productsToImport} productos excedería el límite de su plan (${maxProducts}). Actualmente tiene ${currentCount} productos.`,
            retryable: false,
            context: { current: currentCount, limit: maxProducts, importing: productsToImport }
          })
        );
      }
    }

    const now = clock().toISOString();

    let importedProducts = 0;
    let importedPresentations = 0;
    let skippedProducts = 0;

    for (const gp of globalProducts) {
      const existingProducts = await db.listProducts(tenant.tenantSlug);
      const skuExists = existingProducts.some((p) => p.sku === gp.sku && !p.deletedAt);

      if (skuExists) {
        skippedProducts++;
        continue;
      }

      const productLocalId = uuid();
      let defaultPresentationId: string | null = null;

      const product: Product = {
        localId: productLocalId,
        tenantId: tenant.tenantSlug,
        name: gp.name,
        sku: gp.sku,
        description: gp.description ?? null,
        categoryId: gp.categoryId ?? null,
        isWeighted: gp.isWeighted ?? false,
        unitOfMeasure: gp.unitOfMeasure ?? "un",
        isTaxable: gp.isTaxable ?? true,
        isSerialized: gp.isSerialized ?? false,
        weight: gp.weight ?? null,
        length: gp.length ?? null,
        width: gp.width ?? null,
        height: gp.height ?? null,
        visible: gp.visible ?? true,
        defaultPresentationId: null,
        createdAt: now,
        updatedAt: now,
        globalProductId: gp.id
      };

      const createdPresentations: ProductPresentation[] = [];

      for (const gpPres of gp.presentations) {
        const presId = uuid();
        if (gpPres.isDefault) {
          defaultPresentationId = presId;
        }

        const presentation: ProductPresentation = {
          id: presId,
          tenantId: tenant.tenantSlug,
          productLocalId: productLocalId,
          name: gpPres.name,
          factor: gpPres.factor,
          price: gpPres.price,
          ...(gpPres.barcode ? { barcode: gpPres.barcode } : {}),
          isDefault: gpPres.isDefault,
          createdAt: now,
          updatedAt: now
        };

        await db.createPresentation(presentation);
        createdPresentations.push(presentation);
        importedPresentations++;

        const syncResult = await syncEngine.enqueue({
          id: uuid(),
          table: "product_presentations",
          operation: "create",
          payload: {
            id: presId,
            tenant_id: tenant.tenantSlug,
            product_local_id: productLocalId,
            name: gpPres.name,
            factor: gpPres.factor,
            price: gpPres.price,
            barcode: gpPres.barcode ?? null,
            is_default: gpPres.isDefault,
            created_at: now,
            updated_at: now
          },
          localId: presId,
          tenantId: tenant.tenantSlug,
          createdAt: now,
          attempts: 0
        });
        if (!syncResult.ok) {
          return err(syncResult.error);
        }
      }

      if (defaultPresentationId) {
        product.defaultPresentationId = defaultPresentationId;
      }

      await db.createProduct(product);
      importedProducts++;

      const syncProductResult = await syncEngine.enqueue({
        id: uuid(),
        table: "products",
        operation: "create",
        payload: {
          local_id: productLocalId,
          tenant_id: tenant.tenantSlug,
          name: gp.name,
          sku: gp.sku,
          description: gp.description ?? null,
          category_id: gp.categoryId ?? null,
          is_weighted: gp.isWeighted ?? false,
          unit_of_measure: gp.unitOfMeasure ?? "un",
          is_taxable: gp.isTaxable ?? true,
          is_serialized: gp.isSerialized ?? false,
          weight: gp.weight ?? null,
          length: gp.length ?? null,
          width: gp.width ?? null,
          height: gp.height ?? null,
          visible: gp.visible ?? true,
          default_presentation_id: defaultPresentationId,
          created_at: now,
          updated_at: now,
          global_product_id: gp.id
        },
        localId: productLocalId,
        tenantId: tenant.tenantSlug,
        createdAt: now,
        attempts: 0
      });
      if (!syncProductResult.ok) {
        return err(syncProductResult.error);
      }

      eventBus.emit("PRODUCT.CREATED", {
        tenantId: tenant.tenantSlug,
        localId: productLocalId,
        visible: product.visible,
        variantsCount: createdPresentations.length
      });
    }

    return ok({
      importedProducts,
      importedPresentations,
      skippedProducts
    });
  };

  return {
    createCategory,
    createProduct,
    createProductWithVariants,
    createPresentation,
    updateCategory,
    updateProduct,
    listCategories,
    listProducts,
    listPresentations,
    updatePresentation,
    deleteCategory,
    deleteProduct,
    importGlobalProducts
  };
};
