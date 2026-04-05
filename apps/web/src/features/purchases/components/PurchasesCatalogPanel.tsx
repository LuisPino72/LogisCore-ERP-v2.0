/**
 * Panel para gestionar el catálogo de compras y proveedores.
 * Permite crear categorías, productos y presentaciones desde el módulo de compras.
 */

import { useState } from "react";
import type { Category, Product, ProductPresentation } from "@/features/products/types/products.types";
import { usePurchases } from "../hooks/usePurchases";
import type { PurchasesActorContext } from "../types/purchases.types";

interface PurchasesCatalogPanelProps {
  tenantSlug: string;
  actor: PurchasesActorContext;
  categories: Category[];
  products: Product[];
  presentations: ProductPresentation[];
}

export function PurchasesCatalogPanel({
  tenantSlug,
  actor,
  categories,
  products,
  presentations
}: PurchasesCatalogPanelProps) {
  const { state, requestCreateCategory, requestCreateProduct, requestCreatePresentation } =
    usePurchases({ tenant: { tenantSlug }, actor });
  const [categoryName, setCategoryName] = useState("");
  const [productName, setProductName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [defaultPresentationId, setDefaultPresentationId] = useState("");
  const [presentationProductLocalId, setPresentationProductLocalId] = useState("");
  const [presentationName, setPresentationName] = useState("");
  const [presentationFactor, setPresentationFactor] = useState("1");

  return (
    <section className="border border-surface-200 rounded-xl bg-surface-50 p-3 mt-4 mb-4">
      <h2 className="mt-0 text-lg font-semibold text-content-primary">Compras: Gestion de Catalogo</h2>
      <p className="mt-0 text-sm text-content-secondary">
        Regla 7.5 aplicada: categorias y productos se crean desde Compras.
      </p>

      <div className="grid gap-2 mb-3">
        <input
          value={categoryName}
          onChange={(event) => setCategoryName(event.target.value)}
          placeholder="Nueva categoria"
          className="px-3 py-2 border border-surface-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
        />
        <button
          type="button"
          disabled={state.isSubmitting}
          onClick={() => {
            void requestCreateCategory({ name: categoryName });
          }}
          className="px-3 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
        >
          Crear categoria
        </button>
      </div>

      <div className="grid gap-2 mb-3">
        <input
          value={productName}
          onChange={(event) => setProductName(event.target.value)}
          placeholder="Nuevo producto"
          className="px-3 py-2 border border-surface-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
        />
        <select
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          className="px-3 py-2 border border-surface-300 rounded-lg text-sm"
        >
          <option value="">Sin categoria</option>
          {categories.map((category) => (
            <option key={category.localId} value={category.localId}>
              {category.name}
            </option>
          ))}
        </select>
        <select
          value={defaultPresentationId}
          onChange={(event) => setDefaultPresentationId(event.target.value)}
          className="px-3 py-2 border border-surface-300 rounded-lg text-sm"
        >
          <option value="">Sin presentacion por defecto</option>
          {presentations.map((presentation) => (
            <option key={presentation.id} value={presentation.id}>
              {presentation.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={state.isSubmitting}
          onClick={() => {
            const input = {
              name: productName,
              visible: true
            };
            if (categoryId) {
              Object.assign(input, { categoryId });
            }
            if (defaultPresentationId) {
              Object.assign(input, { defaultPresentationId });
            }
            void requestCreateProduct(input);
          }}
          className="px-3 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
        >
          Crear producto
        </button>
      </div>

      <div className="grid gap-2">
        <select
          value={presentationProductLocalId}
          onChange={(event) => setPresentationProductLocalId(event.target.value)}
          className="px-3 py-2 border border-surface-300 rounded-lg text-sm"
        >
          <option value="">Producto para presentacion</option>
          {products.map((product) => (
            <option key={product.localId} value={product.localId}>
              {product.name}
            </option>
          ))}
        </select>
        <input
          value={presentationName}
          onChange={(event) => setPresentationName(event.target.value)}
          placeholder="Nombre presentacion"
          className="px-3 py-2 border border-surface-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
        />
        <input
          value={presentationFactor}
          onChange={(event) => setPresentationFactor(event.target.value)}
          type="number"
          min="0.0001"
          step="0.0001"
          className="px-3 py-2 border border-surface-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
        />
        <button
          type="button"
          disabled={state.isSubmitting}
          onClick={() => {
            void requestCreatePresentation({
              productLocalId: presentationProductLocalId,
              name: presentationName,
              factor: Number(presentationFactor)
            });
          }}
          className="px-3 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
        >
          Crear presentacion
        </button>
      </div>

      {state.lastError ? (
        <p className="text-state-error mt-2 text-sm">{state.lastError.message}</p>
      ) : null}
    </section>
  );
}
