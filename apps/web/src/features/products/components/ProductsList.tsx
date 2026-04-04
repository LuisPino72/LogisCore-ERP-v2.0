/**
 * Componente de lista de productos
 * Muestra el catálogo de productos, categorías y presentaciones con precios duales USD/Bs
 */

import type { Category, Product, ProductPresentation } from "../types/products.types";

const DEFAULT_EXCHANGE_RATE = 480;

const formatMoney = (value: number, currency: string): string => {
  return new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency
  }).format(value);
};

const formatPrice = (priceUsd: number | undefined, exchangeRate: number): string => {
  const price = priceUsd ?? 0;
  const priceBs = price * exchangeRate;
  
  if (price === 0) {
    return "Sin precio";
  }
  
  return `${formatMoney(price, "USD")} (${formatMoney(priceBs, "VES")})`;
};

/** Props del componente */
interface ProductsListProps {
  categories: Category[];
  products: Product[];
  presentations: ProductPresentation[];
  exchangeRate?: number;
}

/**
 * Lista visual de productos
 * @param categories - Categorías disponibles
 * @param products - Productos del catálogo
 * @param presentations - Presentaciones (variantes) de productos
 * @param exchangeRate - Tasa de cambio USD -> Bs (default: 480)
 */
export function ProductsList({
  categories,
  products,
  presentations,
  exchangeRate = DEFAULT_EXCHANGE_RATE
}: ProductsListProps) {
  const getPresentationsForProduct = (productLocalId: string) => {
    return presentations.filter((p) => p.productLocalId === productLocalId);
  };

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
      <p style={{ margin: "0 0 16px 0", fontSize: "12px", color: "var(--color-content-secondary)" }}>
        Tasa de cambio: {formatMoney(exchangeRate, "VES")}/USD
      </p>
      <ul style={{ margin: 0, paddingLeft: "20px" }}>
        {products.map((product) => (
          <li key={product.localId} style={{ marginBottom: "12px" }}>
            <strong>{product.name}</strong>
            {" - "}
            {product.visible ? "visible" : "oculto"}
            <ul style={{ margin: "4px 0", fontSize: "13px" }}>
              {getPresentationsForProduct(product.localId).map((pres) => (
                <li key={pres.id}>
                  {pres.name} (x{pres.factor}): {formatPrice(pres.price, exchangeRate)}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
