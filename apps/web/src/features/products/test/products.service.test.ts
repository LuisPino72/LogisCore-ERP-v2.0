import { describe, expect, it, vi } from "vitest";
import { InMemoryEventBus, ok, type SyncEngine } from "@logiscore/core";
import { createProductsService, type ProductsDb } from "../services/products.service";
import type { Category, Product, ProductPresentation } from "../types/products.types";

const createProductsDbMock = (): ProductsDb => {
  const categories = new Map<string, Category>();
  const products = new Map<string, Product>();
  const presentations = new Map<string, ProductPresentation>();

  return {
    async createCategory(category) {
      categories.set(category.localId, category);
    },
    async createProduct(product) {
      products.set(product.localId, product);
    },
    async createPresentation(presentation) {
      presentations.set(presentation.id, presentation);
    },
    async updateCategory(category) {
      categories.set(category.localId, category);
    },
    async updateProduct(product) {
      products.set(product.localId, product);
    },
    async listCategories(tenantId) {
      return [...categories.values()].filter((item) => item.tenantId === tenantId);
    },
    async listProducts(tenantId) {
      return [...products.values()].filter((item) => item.tenantId === tenantId);
    },
    async listPresentations(tenantId) {
      return [...presentations.values()].filter((item) => item.tenantId === tenantId);
    },
    async softDeleteCategory(localId, tenantId, deletedAt) {
      const category = categories.get(localId);
      if (!category || category.tenantId !== tenantId) {
        return;
      }
      categories.set(localId, { ...category, deletedAt, updatedAt: deletedAt });
    },
    async softDeleteProduct(localId, tenantId, deletedAt) {
      const product = products.get(localId);
      if (!product || product.tenantId !== tenantId) {
        return;
      }
      products.set(localId, { ...product, deletedAt, updatedAt: deletedAt });
    },
    async countActiveProductsByCategory(localId, tenantId) {
      return [...products.values()].filter(
        (item) =>
          item.tenantId === tenantId &&
          item.categoryId === localId &&
          !item.deletedAt
      ).length;
    },
    async countActivePresentationsByProduct(productLocalId, tenantId) {
      return [...presentations.values()].filter(
        (item) =>
          item.tenantId === tenantId &&
          item.productLocalId === productLocalId &&
          !item.deletedAt
      ).length;
    },
    async getCategoryById(localId, tenantId) {
      const category = categories.get(localId);
      return category?.tenantId === tenantId ? category : null;
    },
    async getProductById(localId, tenantId) {
      const product = products.get(localId);
      return product?.tenantId === tenantId ? product : null;
    },
    async getPresentationById(id, tenantId) {
      const presentation = presentations.get(id);
      return presentation?.tenantId === tenantId ? presentation : null;
    }
  };
};

const createSyncEngineMock = (): SyncEngine => ({
  enqueue: vi.fn(async () => ok<void>(undefined)),
  processNext: vi.fn(async () => ok<"processed" | "skipped">("skipped")),
  startPeriodicSync: vi.fn(),
  stopPeriodicSync: vi.fn(),
  getStatus: vi.fn(() => "idle")
});

const createSupabaseMock = () => ({
  rpc: vi.fn(async (fn: string) => {
    if (fn === "secure_soft_delete_category") {
      return {
        data: [{ success: true, code: "CATEGORY_SOFT_DELETED", message: "ok" }],
        error: null
      };
    }
    if (fn === "secure_soft_delete_product") {
      return {
        data: [{ success: true, code: "PRODUCT_SOFT_DELETED", message: "ok" }],
        error: null
      };
    }
    return { data: null, error: { message: "rpc_not_found" } };
  })
});

const ownerActor = {
  role: "owner" as const,
  permissions: {
    canApplyDiscount: true,
    maxDiscountPercent: 20,
    canApplyCustomPrice: true,
    canVoidSale: true,
    canRefundSale: true,
    canVoidInvoice: true,
    canAdjustStock: true
  }
};

describe("products.service", () => {
  it("crea categoria en orden offline: enqueue antes de commit", async () => {
    const trace: string[] = [];
    const baseDb = createProductsDbMock();
    const db: ProductsDb = {
      ...baseDb,
      async createCategory(category) {
        trace.push("db.commit");
        return baseDb.createCategory(category);
      }
    };
    const syncEngine = createSyncEngineMock();
    syncEngine.enqueue = vi.fn(async () => {
      trace.push("sync.enqueue");
      return ok<void>(undefined);
    });

    const service = createProductsService({
      db,
      syncEngine,
      eventBus: new InMemoryEventBus(),
      supabase: createSupabaseMock(),
      clock: () => new Date("2026-01-01T00:00:00.000Z"),
      uuid: () => crypto.randomUUID()
    });

    const result = await service.createCategory(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      { name: "Bebidas", sourceModule: "purchases" }
    );

    expect(result.ok).toBe(true);
    expect(trace).toEqual(["sync.enqueue", "db.commit"]);
  });

  it("no permite crear producto desde modulo distinto a compras", async () => {
    const service = createProductsService({
      db: createProductsDbMock(),
      syncEngine: createSyncEngineMock(),
      eventBus: new InMemoryEventBus(),
      supabase: createSupabaseMock()
    });

    const result = await service.createProduct(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      {
        name: "Producto X",
        visible: true,
        sourceModule: "inventory" as "purchases"
      }
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("PRODUCT_CREATION_FORBIDDEN_MODULE");
    }
  });

  it("crea presentacion sin encolar sync (tabla no sincronizada)", async () => {
    const syncEngine = createSyncEngineMock();
    const db = createProductsDbMock();
    const service = createProductsService({
      db,
      syncEngine,
      eventBus: new InMemoryEventBus(),
      supabase: createSupabaseMock()
    });

    const productResult = await service.createProduct(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      {
        name: "Harina",
        sku: "HAR-001",
        visible: true,
        sourceModule: "purchases"
      }
    );
    expect(productResult.ok).toBe(true);
    if (!productResult.ok) {
      return;
    }
    const enqueueCallsBeforePresentation = (syncEngine.enqueue as ReturnType<
      typeof vi.fn
    >).mock.calls.length;

    const result = await service.createPresentation(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      {
        productLocalId: productResult.data.localId,
        name: "Caja",
        factor: 12
      }
    );

    expect(result.ok).toBe(true);
    expect((syncEngine.enqueue as ReturnType<typeof vi.fn>).mock.calls.length).toBe(
      enqueueCallsBeforePresentation
    );
  });

  it("bloquea empleados sin permisos de catalogo", async () => {
    const service = createProductsService({
      db: createProductsDbMock(),
      syncEngine: createSyncEngineMock(),
      eventBus: new InMemoryEventBus(),
      supabase: createSupabaseMock()
    });

    const result = await service.createCategory(
      { tenantSlug: "tenant-demo" },
      {
        role: "employee",
        permissions: {
          canApplyDiscount: false,
          maxDiscountPercent: 0,
          canApplyCustomPrice: false,
          canVoidSale: false,
          canRefundSale: false,
          canVoidInvoice: false,
          canAdjustStock: false
        }
      },
      { name: "No permitido", sourceModule: "purchases" }
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("CATALOG_PERMISSION_DENIED");
    }
  });

  it("ejecuta borrado de categoria via RPC segura", async () => {
    const db = createProductsDbMock();
    const service = createProductsService({
      db,
      syncEngine: createSyncEngineMock(),
      eventBus: new InMemoryEventBus(),
      supabase: createSupabaseMock(),
      clock: () => new Date("2026-01-01T00:00:00.000Z"),
      uuid: () => crypto.randomUUID()
    });

    const categoryResult = await service.createCategory(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      { name: "Lacteos", sourceModule: "purchases" }
    );
    expect(categoryResult.ok).toBe(true);
    if (!categoryResult.ok) {
      return;
    }

    const deleteResult = await service.deleteCategory(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      categoryResult.data.localId
    );
    expect(deleteResult.ok).toBe(true);
  });

  it("actualiza producto con presentacion por defecto valida", async () => {
    const db = createProductsDbMock();
    const service = createProductsService({
      db,
      syncEngine: createSyncEngineMock(),
      eventBus: new InMemoryEventBus(),
      supabase: createSupabaseMock()
    });

    const productResult = await service.createProduct(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      {
        name: "Cafe",
        sku: "CAFE-001",
        visible: true,
        sourceModule: "purchases"
      }
    );
    expect(productResult.ok).toBe(true);
    if (!productResult.ok) {
      return;
    }

    const presentationResult = await service.createPresentation(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      {
        productLocalId: productResult.data.localId,
        name: "Paquete",
        factor: 1
      }
    );
    expect(presentationResult.ok).toBe(true);
    if (!presentationResult.ok) {
      return;
    }

    const updateResult = await service.updateProduct(
      { tenantSlug: "tenant-demo" },
      ownerActor,
      {
        localId: productResult.data.localId,
        name: "Cafe molido",
        visible: true,
        defaultPresentationId: presentationResult.data.id
      }
    );
    expect(updateResult.ok).toBe(true);
    if (updateResult.ok) {
      expect(updateResult.data.defaultPresentationId).toBe(
        presentationResult.data.id
      );
    }
  });
});
