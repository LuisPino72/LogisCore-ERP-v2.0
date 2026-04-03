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
    <section
      style={{
        border: "1px solid var(--border)",
        borderRadius: "8px",
        background: "white",
        padding: "12px",
        marginTop: "16px",
        marginBottom: "16px"
      }}
    >
      <h2 style={{ marginTop: 0 }}>Compras: Gestion de Catalogo</h2>
      <p style={{ marginTop: 0 }}>
        Regla 7.5 aplicada: categorias y productos se crean desde Compras.
      </p>

      <div style={{ display: "grid", gap: "8px", marginBottom: "12px" }}>
        <input
          value={categoryName}
          onChange={(event) => setCategoryName(event.target.value)}
          placeholder="Nueva categoria"
        />
        <button
          type="button"
          disabled={state.isSubmitting}
          onClick={() => {
            void requestCreateCategory({ name: categoryName });
          }}
        >
          Crear categoria
        </button>
      </div>

      <div style={{ display: "grid", gap: "8px", marginBottom: "12px" }}>
        <input
          value={productName}
          onChange={(event) => setProductName(event.target.value)}
          placeholder="Nuevo producto"
        />
        <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
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
        >
          Crear producto
        </button>
      </div>

      <div style={{ display: "grid", gap: "8px" }}>
        <select
          value={presentationProductLocalId}
          onChange={(event) => setPresentationProductLocalId(event.target.value)}
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
        />
        <input
          value={presentationFactor}
          onChange={(event) => setPresentationFactor(event.target.value)}
          type="number"
          min="0.0001"
          step="0.0001"
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
        >
          Crear presentacion
        </button>
      </div>

      {state.lastError ? (
        <p className="text-red-700 mb-0">{state.lastError.message}</p>
      ) : null}
    </section>
  );
}
