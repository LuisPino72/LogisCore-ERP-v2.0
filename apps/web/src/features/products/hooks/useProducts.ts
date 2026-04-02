/**
 * Hook de productos
 * Coordina el estado de UI para gestión de productos, categorías y presentaciones
 */

import { useCallback, useState } from "react";
import type { ProductsService } from "../services/products.service";
import type {
  CreateCategoryInput,
  CreateProductInput,
  CreateProductPresentationInput,
  ProductsActorContext,
  ProductsTenantContext,
  ProductsUiState
} from "../types/products.types";

/** Estado inicial vacío */
const initialState: ProductsUiState = {
  isLoading: false,
  categories: [],
  products: [],
  presentations: [],
  lastError: null
};

interface UseProductsOptions {
  service: ProductsService;
  tenant: ProductsTenantContext;
  actor: ProductsActorContext;
}

/**
 * Hook para gestionar productos
 * @param service - Servicio de productos inyectado
 * @param tenant - Contexto del tenant
 * @param actor - Contexto del usuario (rol y permisos)
 */
export const useProducts = ({
  service,
  tenant,
  actor
}: UseProductsOptions) => {
  const [state, setState] = useState<ProductsUiState>(initialState);

  /**
   * Refresca todos los datos: categorías, productos y presentaciones
   */
  const refresh = useCallback(async () => {
    setState((previous) => ({ ...previous, isLoading: true, lastError: null }));
    const [categoriesResult, productsResult, presentationsResult] = await Promise.all([
      service.listCategories(tenant),
      service.listProducts(tenant),
      service.listPresentations(tenant)
    ]);

    if (!categoriesResult.ok) {
      setState((previous) => ({
        ...previous,
        isLoading: false,
        lastError: categoriesResult.error
      }));
      return;
    }

    if (!productsResult.ok) {
      setState((previous) => ({
        ...previous,
        isLoading: false,
        lastError: productsResult.error
      }));
      return;
    }

    if (!presentationsResult.ok) {
      setState((previous) => ({
        ...previous,
        isLoading: false,
        lastError: presentationsResult.error
      }));
      return;
    }

    setState({
      isLoading: false,
      categories: categoriesResult.data,
      products: productsResult.data,
      presentations: presentationsResult.data,
      lastError: null
    });
  }, [service, tenant]);

  /**
   * Crea una nueva categoría
   */
  const createCategory = useCallback(
    async (input: CreateCategoryInput) => {
      const result = await service.createCategory(tenant, actor, input);
      if (!result.ok) {
        setState((previous) => ({ ...previous, lastError: result.error }));
        return;
      }
      await refresh();
    },
    [actor, refresh, service, tenant]
  );

  /**
   * Crea un nuevo producto
   */
  const createProduct = useCallback(
    async (input: CreateProductInput) => {
      const result = await service.createProduct(tenant, actor, input);
      if (!result.ok) {
        setState((previous) => ({ ...previous, lastError: result.error }));
        return;
      }
      await refresh();
    },
    [actor, refresh, service, tenant]
  );

  /**
   * Crea una nueva presentación (variante) de producto
   */
  const createPresentation = useCallback(
    async (input: CreateProductPresentationInput) => {
      const result = await service.createPresentation(tenant, actor, input);
      if (!result.ok) {
        setState((previous) => ({ ...previous, lastError: result.error }));
        return;
      }
      await refresh();
    },
    [actor, refresh, service, tenant]
  );

  return {
    state,
    refresh,
    createCategory,
    createProduct,
    createPresentation
  };
};
