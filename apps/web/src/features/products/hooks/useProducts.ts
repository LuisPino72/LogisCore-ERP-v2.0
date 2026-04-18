/**
 * Hook de productos
 * Coordina el estado de UI para gestión de productos, categorías y presentaciones
 */

import { useCallback, useState, useRef, useEffect } from "react";
import { eventBus } from "@/lib/core/runtime";
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
  sizeColors: [],
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
  const serviceRef = useRef(service);
  const tenantRef = useRef(tenant);
  const actorRef = useRef(actor);

  useEffect(() => {
    serviceRef.current = service;
    tenantRef.current = tenant;
    actorRef.current = actor;
  }, [service, tenant, actor]);

  /**
   * Refresca todos los datos: categorías, productos y presentaciones
   */
  const refresh = useCallback(async () => {
    setState((previous) => ({ ...previous, isLoading: true, lastError: null }));
    const [categoriesResult, productsResult, presentationsResult] = await Promise.all([
      serviceRef.current.listCategories(tenantRef.current),
      serviceRef.current.listProducts(tenantRef.current),
      serviceRef.current.listPresentations(tenantRef.current)
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
      sizeColors: [],
      lastError: null
    });
  }, []);

  /**
   * Escucha eventos de sincronización para refrescar la UI (Regla de Oro #4)
   */
  useEffect(() => {
    const featureTables = ["products", "categories", "product_presentations", "product_size_colors"];
    
    return eventBus.on<{ table: string }>("SYNC.REFRESH_TABLE", (payload) => {
      if (featureTables.includes(payload.table)) {
        void refresh();
      }
    });
  }, [refresh]);

  /**
   * Crea una nueva categoría
   */
  const createCategory = useCallback(
    async (input: CreateCategoryInput) => {
      const result = await serviceRef.current.createCategory(tenantRef.current, actorRef.current, input);
      if (!result.ok) {
        setState((previous) => ({ ...previous, lastError: result.error }));
        return;
      }
      refresh();
    },
    [refresh]
  );

  /**
   * Crea un nuevo producto
   */
  const createProduct = useCallback(
    async (input: CreateProductInput) => {
      const result = await serviceRef.current.createProduct(tenantRef.current, actorRef.current, input);
      if (!result.ok) {
        setState((previous) => ({ ...previous, lastError: result.error }));
        return;
      }
      refresh();
    },
    [refresh]
  );

  /**
   * Crea una nueva presentación (variante) de producto
   */
  const createPresentation = useCallback(
    async (input: CreateProductPresentationInput) => {
      const result = await serviceRef.current.createPresentation(tenantRef.current, actorRef.current, input);
      if (!result.ok) {
        setState((previous) => ({ ...previous, lastError: result.error }));
        return;
      }
      refresh();
    },
    [refresh]
  );

  return {
    state,
    refresh,
    createCategory,
    createProduct,
    createPresentation
  };
};