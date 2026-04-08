import { productsService } from "@/features/products/services/products.service.instance";
import type {
  CreateCategoryInput,
  CreateProductInput,
  CreateProductPresentationInput,
  ProductsTenantContext
} from "@/features/products/types/products.types";

export const purchasesCatalogService = {
  listCategories: (tenant: ProductsTenantContext) =>
    productsService.listCategories(tenant),
  listProducts: (tenant: ProductsTenantContext) =>
    productsService.listProducts(tenant),
  listPresentations: (tenant: ProductsTenantContext) =>
    productsService.listPresentations(tenant),
  createCategory: (input: CreateCategoryInput) =>
    productsService.createCategory(input),
  createProduct: (input: CreateProductInput) =>
    productsService.createProduct(input),
  createPresentation: (input: CreateProductPresentationInput) =>
    productsService.createPresentation(input)
};
