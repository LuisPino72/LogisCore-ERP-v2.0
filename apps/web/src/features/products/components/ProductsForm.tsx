/**
 * Componente de formulario para crear productos
 * UI para crear categorías, productos y presentaciones
 */

import { useState } from "react";
import type {
  Category,
  CreateCategoryInput,
  CreateProductInput,
  CreateProductPresentationInput,
  Product,
  ProductPresentation
} from "../types/products.types";

/**
 * Props del formulario de productos
 */
interface ProductsFormProps {
  categories: Category[];
  products: Product[];
  presentations: ProductPresentation[];
  onCreateCategory: (input: CreateCategoryInput) => Promise<void>;
  onCreateProduct: (input: CreateProductInput) => Promise<void>;
  onCreatePresentation: (input: CreateProductPresentationInput) => Promise<void>;
}

/**
 * Formulario para crear elementos del catálogo
 */
export function ProductsForm({
  categories,
  products,
  presentations,
  onCreateCategory,
  onCreateProduct,
  onCreatePresentation
}: ProductsFormProps) {
  const [categoryName, setCategoryName] = useState("");
  const [productName, setProductName] = useState("");
  const [productSku, setProductSku] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedDefaultPresentationId, setSelectedDefaultPresentationId] =
    useState("");
  const [isTaxable, setIsTaxable] = useState(true);
  const [presentationName, setPresentationName] = useState("");
  const [selectedProductForPresentation, setSelectedProductForPresentation] =
    useState("");
  const [presentationFactor, setPresentationFactor] = useState("1");
  const [presentationPrice, setPresentationPrice] = useState("");

  return (
    <section
      style={{
        border: "1px solid var(--border)",
        borderRadius: "8px",
        padding: "12px",
        marginBottom: "16px",
        background: "white"
      }}
    >
      <h2 style={{ marginTop: 0 }}>Catalogo</h2>
      <div style={{ display: "grid", gap: "8px", marginBottom: "10px" }}>
        <input
          value={categoryName}
          onChange={(event) => setCategoryName(event.target.value)}
          placeholder="Nueva categoria"
        />
        <button
          type="button"
          onClick={() =>
            onCreateCategory({ name: categoryName, sourceModule: "purchases" })
          }
        >
          Crear categoria
        </button>
      </div>
      <div style={{ display: "grid", gap: "8px" }}>
        <input
          value={productName}
          onChange={(event) => setProductName(event.target.value)}
          placeholder="Nuevo producto"
        />
        <input
          value={productSku}
          onChange={(event) => setProductSku(event.target.value)}
          placeholder="SKU (codigo)"
        />
        <select
          value={selectedCategoryId}
          onChange={(event) => setSelectedCategoryId(event.target.value)}
        >
          <option value="">Sin categoria</option>
          {categories.map((category) => (
            <option key={category.localId} value={category.localId}>
              {category.name}
            </option>
          ))}
        </select>
        <select
          value={selectedDefaultPresentationId}
          onChange={(event) => setSelectedDefaultPresentationId(event.target.value)}
        >
          <option value="">Sin presentacion por defecto</option>
          {presentations.map((presentation) => (
            <option key={presentation.id} value={presentation.id}>
              {presentation.name}
            </option>
          ))}
        </select>
        <label style={{ display: "flex", gap: "8px", alignItems: "center", fontSize: "14px" }}>
          <input
            type="checkbox"
            checked={isTaxable}
            onChange={(e) => setIsTaxable(e.target.checked)}
          />
          Aplicar IVA (Impuestos globales)
        </label>
        <button
          type="button"
          onClick={() =>
            onCreateProduct({
              name: productName,
              sku: productSku || crypto.randomUUID(),
              categoryId: selectedCategoryId || "",
              defaultPresentationId: selectedDefaultPresentationId || "",
              visible: true,
              isTaxable: isTaxable,
              sourceModule: "purchases"
            })
          }
        >
          Crear producto
        </button>
      </div>
      <hr style={{ margin: "12px 0" }} />
      <div style={{ display: "grid", gap: "8px" }}>
        <select
          value={selectedProductForPresentation}
          onChange={(event) => setSelectedProductForPresentation(event.target.value)}
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
          placeholder="Nombre de presentacion"
        />
        <input
          value={presentationFactor}
          onChange={(event) => setPresentationFactor(event.target.value)}
          placeholder="Factor"
          type="number"
          min="0.0001"
          step="0.0001"
        />
        <input
          value={presentationPrice}
          onChange={(event) => setPresentationPrice(event.target.value)}
          placeholder="Precio en USD"
          type="number"
          min="0"
          step="0.01"
        />
        <button
          type="button"
          onClick={() =>
            onCreatePresentation({
              productLocalId: selectedProductForPresentation,
              name: presentationName,
              factor: Number(presentationFactor),
              price: presentationPrice ? Number(presentationPrice) : 0
            })
          }
        >
          Crear presentacion
        </button>
      </div>
    </section>
  );
}
