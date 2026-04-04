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
  UpdateCategoryInput,
  UpdateProductInput,
  UpdateProductPresentationInput,
  Product,
  ProductPresentation,
  ProductsTenantContext
} from "../types/products.types";

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
  updateCategory(category: Category): Promise<void>;
  updateProduct(product: Product): Promise<void>;
  updatePresentation(presentation: ProductPresentation): Promise<void>;
  listCategories(tenantId: string): Promise<Category[]>;
  listProducts(tenantId: string): Promise<Product[]>;
  listPresentations(tenantId: string): Promise<ProductPresentation[]>;
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
    eventBus.emit("CATALOG.CATEGORY_CREATED", {
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

      if (!input.name.trim()) {
        return err(
          createAppError({
            code: "PRODUCT_NAME_REQUIRED",
            message: "El nombre del producto es obligatorio.",
            retryable: false
          })
        );
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
      eventBus.emit("CATALOG.PRODUCT_CREATED", {
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
    eventBus.emit("CATALOG.CATEGORY_UPDATED", {
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
      eventBus.emit("CATALOG.PRODUCT_UPDATED", {
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
      eventBus.emit("CATALOG.PRESENTATION_CREATED", {
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
    eventBus.emit("CATALOG.CATEGORY_DELETED", {
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
      eventBus.emit("CATALOG.PRODUCT_DELETED", {
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
      eventBus.emit("CATALOG.PRESENTATION_UPDATED", {
        tenantId: tenant.tenantSlug,
        id: updated.id,
        productLocalId: updated.productLocalId
      });
      return ok(updated);
    };

    return {
      createCategory,
      createProduct,
      createPresentation,
      updateCategory,
      updateProduct,
      listCategories,
      listProducts,
      listPresentations,
      updatePresentation,
      deleteCategory,
      deleteProduct
    };
  };
