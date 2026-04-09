import { productsService } from "@/features/products/services/products.service.instance";
import type {
  CreateCategoryInput,
  CreateProductInput,
  CreateProductPresentationInput,
  ProductsActorContext,
  ProductsTenantContext
} from "@/features/products/types/products.types";

export const purchasesCatalogService = {
  listCategories: (tenant: ProductsTenantContext) =>
    productsService.listCategories(tenant),
  listProducts: (tenant: ProductsTenantContext) =>
    productsService.listProducts(tenant),
  listPresentations: (tenant: ProductsTenantContext) =>
    productsService.listPresentations(tenant),
  createCategory: (
    tenant: ProductsTenantContext,
    actor: ProductsActorContext,
    input: CreateCategoryInput
  ) => productsService.createCategory(tenant, actor, input),
  createProduct: (
    tenant: ProductsTenantContext,
    actor: ProductsActorContext,
    input: CreateProductInput
  ) => productsService.createProduct(tenant, actor, input),
  createPresentation: (
    tenant: ProductsTenantContext,
    actor: ProductsActorContext,
    input: CreateProductPresentationInput
  ) => productsService.createPresentation(tenant, actor, input)
};
