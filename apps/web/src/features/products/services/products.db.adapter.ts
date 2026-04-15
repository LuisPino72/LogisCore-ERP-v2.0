/**
 * Adaptador de base de datos local para productos (Dexie/IndexedDB).
 * Implementa la interfaz ProductsDb con operaciones CRUD y de negocio.
 */

import {
  db,
  type CategoryRecord,
  type ProductPresentationRecord,
  type ProductRecord,
  type ProductSizeColorRecord
} from "@/lib/db/dexie";
import type { ProductsDb } from "./products.service";

// Implementa la interfaz ProductsDb usando Dexie/IndexedDB
export class DexieProductsDbAdapter implements ProductsDb {
  async createCategory(category: CategoryRecord): Promise<void> {
    await db.categories.put(category);
  }

  async createProduct(product: ProductRecord): Promise<void> {
    await db.products.put(product);
  }

  async createPresentation(presentation: ProductPresentationRecord): Promise<void> {
    await db.product_presentations.put(presentation);
  }

  async createProductSizeColor(item: ProductSizeColorRecord): Promise<void> {
    await db.product_size_colors.put(item);
  }

  async updateCategory(category: CategoryRecord): Promise<void> {
    await db.categories.put(category);
  }

  async updateProduct(product: ProductRecord): Promise<void> {
    await db.products.put(product);
  }

  async updatePresentation(presentation: ProductPresentationRecord): Promise<void> {
    await db.product_presentations.put(presentation);
  }

  async listCategories(tenantId: string): Promise<CategoryRecord[]> {
    return db.categories
      .where("tenantId")
      .equals(tenantId)
      .and((item) => !item.deletedAt)
      .sortBy("createdAt");
  }

  async listProducts(tenantId: string): Promise<ProductRecord[]> {
    return db.products
      .where("tenantId")
      .equals(tenantId)
      .and((item) => !item.deletedAt)
      .sortBy("createdAt");
  }

  async listPresentations(tenantId: string): Promise<ProductPresentationRecord[]> {
    return db.product_presentations
      .where("tenantId")
      .equals(tenantId)
      .and((item) => !item.deletedAt)
      .sortBy("createdAt");
  }

  async listProductSizeColors(tenantId: string): Promise<ProductSizeColorRecord[]> {
    return db.product_size_colors
      .where("tenantId")
      .equals(tenantId)
      .and((item) => !item.deletedAt)
      .sortBy("createdAt");
  }

  async softDeleteCategory(
    localId: string,
    tenantId: string,
    deletedAt: string
  ): Promise<void> {
    const category = await this.getCategoryById(localId, tenantId);
    if (!category) {
      return;
    }
    await db.categories.update(localId, { deletedAt, updatedAt: deletedAt });
  }

  async softDeleteProduct(
    localId: string,
    tenantId: string,
    deletedAt: string
  ): Promise<void> {
    const product = await db.products.get(localId);
    if (!product || product.tenantId !== tenantId) {
      return;
    }
    await db.products.update(localId, { deletedAt, updatedAt: deletedAt });
  }

  async countActiveProductsByCategory(
    localId: string,
    tenantId: string
  ): Promise<number> {
    const items = await this.listProducts(tenantId);
    return items.filter((item) => item.categoryId === localId).length;
  }

  async countActivePresentationsByProduct(
    productLocalId: string,
    tenantId: string
  ): Promise<number> {
    const presentations = await this.listPresentations(tenantId);
    return presentations.filter(
      (item) => item.productLocalId === productLocalId
    ).length;
  }

  async getCategoryById(localId: string, tenantId: string): Promise<CategoryRecord | null> {
    const category = await db.categories.get(localId);
    if (!category || category.tenantId !== tenantId) {
      return null;
    }
    return category;
  }

  async getProductById(localId: string, tenantId: string): Promise<ProductRecord | null> {
    const product = await db.products.get(localId);
    if (!product || product.tenantId !== tenantId) {
      return null;
    }
    return product;
  }

  async getPresentationById(
    id: string,
    tenantId: string
  ): Promise<ProductPresentationRecord | null> {
    const presentation = await db.product_presentations.get(id);
    if (!presentation || presentation.tenantId !== tenantId) {
      return null;
    }
    return presentation;
  }

  async countActiveProducts(tenantId: string): Promise<number> {
    const products = await db.products
      .where("tenantId")
      .equals(tenantId)
      .and((item) => !item.deletedAt)
      .toArray();
    return products.length;
  }

  async listActiveProducts(tenantId: string): Promise<ProductRecord[]> {
    return db.products
      .where("tenantId")
      .equals(tenantId)
      .and((item) => !item.deletedAt)
      .sortBy("createdAt");
  }
}
