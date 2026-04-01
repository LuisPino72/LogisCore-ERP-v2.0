import { useState } from "react";
import type {
  Category,
  CreateCategoryInput,
  CreateProductInput,
  CreateProductPresentationInput,
  Product,
  ProductPresentation
} from "../types/products.types";

interface ProductsFormProps {
  categories: Category[];
  products: Product[];
  presentations: ProductPresentation[];
  onCreateCategory: (input: CreateCategoryInput) => Promise<void>;
  onCreateProduct: (input: CreateProductInput) => Promise<void>;
  onCreatePresentation: (input: CreateProductPresentationInput) => Promise<void>;
}

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
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedDefaultPresentationId, setSelectedDefaultPresentationId] =
    useState("");
  const [presentationName, setPresentationName] = useState("");
  const [selectedProductForPresentation, setSelectedProductForPresentation] =
    useState("");
  const [presentationFactor, setPresentationFactor] = useState("1");

  return (
    <section
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: "8px",
        padding: "12px",
        marginBottom: "16px",
        background: "#ffffff"
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
        <button
          type="button"
          onClick={() =>
            onCreateProduct({
              name: productName,
              categoryId: selectedCategoryId || undefined,
              defaultPresentationId: selectedDefaultPresentationId || undefined,
              visible: true,
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
        <button
          type="button"
          onClick={() =>
            onCreatePresentation({
              productLocalId: selectedProductForPresentation,
              name: presentationName,
              factor: Number(presentationFactor)
            })
          }
        >
          Crear presentacion
        </button>
      </div>
    </section>
  );
}
