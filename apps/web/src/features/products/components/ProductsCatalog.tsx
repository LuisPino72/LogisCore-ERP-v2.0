/**
 * Componente principal del catálogo de productos.
 * Muestra el catálogo completo de productos con categorías y presentaciones.
 * Escucha eventos del bus para actualización automática.
 */

import { useEffect, useState } from "react";
import { eventBus } from "@/lib/core/runtime";
import { useProducts } from "../hooks/useProducts";
import { productsService } from "../services/products.service.instance";
import { ProductsList } from "./ProductsList";
import type { ProductsActorContext } from "../types/products.types";
import { exchangeRatesService } from "@/features/exchange-rates/services/exchange-rates.service.instance";

const DEFAULT_EXCHANGE_RATE = 480;

interface ProductsCatalogProps {
  tenantSlug: string;
  actor: ProductsActorContext;
}

export function ProductsCatalog({ tenantSlug, actor }: ProductsCatalogProps) {
  const { state, refresh } = useProducts({
    service: productsService,
    tenant: { tenantSlug },
    actor
  });
  const [exchangeRate, setExchangeRate] = useState(DEFAULT_EXCHANGE_RATE);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const loadExchangeRate = async () => {
      const rateResult = await exchangeRatesService.getActiveRate(
        tenantSlug,
        "USD",
        "VES"
      );
      if (rateResult.ok && rateResult.data) {
        setExchangeRate(rateResult.data.rate);
      }
    };
    loadExchangeRate();
  }, [tenantSlug]);

  useEffect(() => {
    const offCreatedCategory = eventBus.on("CATALOG.CATEGORY_CREATED", () => {
      void refresh();
    });
    const offCreatedProduct = eventBus.on("CATALOG.PRODUCT_CREATED", () => {
      void refresh();
    });
    const offCreatedPresentation = eventBus.on(
      "CATALOG.PRESENTATION_CREATED",
      () => {
        void refresh();
      }
    );
    const offDeletedCategory = eventBus.on("CATALOG.CATEGORY_DELETED", () => {
      void refresh();
    });
    const offDeletedProduct = eventBus.on("CATALOG.PRODUCT_DELETED", () => {
      void refresh();
    });

    return () => {
      offCreatedCategory();
      offCreatedProduct();
      offCreatedPresentation();
      offDeletedCategory();
      offDeletedProduct();
    };
  }, [refresh]);

  return (
    <section>
      {state.lastError ? (
        <p className="text-red-700">{state.lastError.message}</p>
      ) : null}
      <ProductsList
        categories={state.categories}
        products={state.products}
        presentations={state.presentations}
        exchangeRate={exchangeRate}
      />
    </section>
  );
}
