/**
 * Componente de lista de productos
 * Muestra el catálogo de productos, categorías y presentaciones
 */

import type { Category, Product, ProductPresentation } from "../types/products.types";

/** Props del componente */
interface ProductsListProps {
  categories: Category[];
  products: Product[];
  presentations: ProductPresentation[];
}

/**
 * Lista visual de productos
 * @param categories - Categorías disponibles
 * @param products - Productos del catálogo
 * @param presentations - Presentaciones (variantes) de productos
 */
export function ProductsList({
  categories,
  products,
  presentations
}: ProductsListProps) {
  return (
    <section
      style={{
        border: "1px solid var(--color-surface-300)",
        borderRadius: "8px",
        background: "var(--color-surface-50)",
        padding: "12px"
      }}
    >
      <h2 style={{ marginTop: 0 }}>Productos y categorias</h2>
      <p style={{ margin: "0 0 8px 0" }}>
        Categorias:
        {" "}
        <strong>{categories.length}</strong>
      </p>
      <p style={{ margin: "0 0 8px 0" }}>
        Productos:
        {" "}
        <strong>{products.length}</strong>
      </p>
      <p style={{ margin: "0 0 8px 0" }}>
        Presentaciones:
        {" "}
        <strong>{presentations.length}</strong>
      </p>
      <ul style={{ margin: 0 }}>
        {products.map((product) => (
          <li key={product.localId}>
            {product.name}
            {" - "}
            {product.visible ? "visible" : "oculto"}
          </li>
        ))}
      </ul>
    </section>
  );
}
