import type { Category, Product, ProductPresentation } from "../types/products.types";

export const UNITS_OF_MEASURE = ["unidad", "kg", "lt", "m"] as const;
export type UnitOfMeasure = (typeof UNITS_OF_MEASURE)[number];

export function formatQty(value: number, isWeighted: boolean | null | undefined): string {
  if (isWeighted) {
    return value.toFixed(4);
  }
  return value.toFixed(2);
}

export function formatPrice(priceUsd: number | undefined, exchangeRate: number): {
  usd: string;
  bs: string;
} {
  const price = priceUsd ?? 0;
  const bs = price * exchangeRate;
  
  const formatterUSD = new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: "USD"
  });
  
  const formatterBS = new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: "VES"
  });
  
  return {
    usd: formatterUSD.format(price),
    bs: formatterBS.format(bs)
  };
}

export function getCategoryName(
  categoryId: string | null | undefined,
  categories: Category[]
): string {
  if (!categoryId) return "Sin categoría";
  const category = categories.find(c => c.localId === categoryId);
  return category?.name ?? "Sin categoría";
}

export function getProductPresentationPrice(
  productLocalId: string,
  presentations: ProductPresentation[],
  _product: Product
): number | undefined {
  const productPres = presentations.filter(p => p.productLocalId === productLocalId);
  const defaultPres = productPres.find(p => p.isDefault) ?? productPres[0];
  return defaultPres?.price;
}

export function getUnitBadgeClass(unit: string | null | undefined): string {
  switch (unit) {
    case "kg":
      return "badge-info";
    case "lt":
      return "badge-info";
    case "m":
      return "badge-info";
    default:
      return "badge-default";
  }
}
