import type { Category, Product, ProductPresentation } from "../types/products.types";

interface ProductsListProps {
  categories: Category[];
  products: Product[];
  presentations: ProductPresentation[];
}

export function ProductsList({
  categories,
  products,
  presentations
}: ProductsListProps) {
  return (
    <section
      style={{
        border: "1px solid #cbd5e1",
        borderRadius: "8px",
        background: "#f8fafc",
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
