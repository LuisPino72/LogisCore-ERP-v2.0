import { Eye, Scale, Receipt, Pencil, DollarSign, Trash2 } from "lucide-react";
import { Badge } from "@/common/components/Badge";
import type { Category, Product, ProductPresentation } from "../types/products.types";
import { getCategoryName, formatPrice, getProductPresentationPrice } from "../utils/products.utils";

interface ProductsDataTableProps {
  products: Product[];
  categories: Category[];
  presentations: ProductPresentation[];
  exchangeRate: number;
  onEdit: (product: Product) => void;
  onPrice: (product: Product) => void;
  onDelete: (product: Product) => void;
}

export function ProductsDataTable({
  products,
  categories,
  presentations,
  exchangeRate,
  onEdit,
  onPrice,
  onDelete
}: ProductsDataTableProps) {
  const activeProducts = products.filter(p => !p.deletedAt);

  return (
    <div className="overflow-x-auto border border-surface-200 rounded-lg">
      <table className="w-full">
        <thead className="bg-surface-50 sticky top-0 z-10">
          <tr>
            <th className="px-4 py-3 text-sm font-medium text-content-primary text-left w-[120px]">SKU</th>
            <th className="px-4 py-3 text-sm font-medium text-content-primary text-left">Producto</th>
            <th className="px-4 py-3 text-sm font-medium text-content-primary text-left w-[150px]">Categoría</th>
            <th className="px-4 py-3 text-sm font-medium text-content-primary text-left w-[80px]">Unidad</th>
            <th className="px-4 py-3 text-sm font-medium text-content-primary text-right w-[100px]">Precio USD</th>
            <th className="px-4 py-3 text-sm font-medium text-content-primary text-right w-[120px]">Precio Bs</th>
            <th className="px-4 py-3 text-sm font-medium text-content-primary text-left w-[200px]">Estado</th>
            <th className="px-4 py-3 text-sm font-medium text-content-primary text-left w-[120px]">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-200">
          {activeProducts.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-content-secondary">
                No hay productos en el catálogo
              </td>
            </tr>
          ) : (
            activeProducts.map(product => {
              const priceUsd = getProductPresentationPrice(product.localId, presentations, product);
              const priceBsFormatted = formatPrice(priceUsd, exchangeRate);
              const categoryName = getCategoryName(product.categoryId, categories);
              
              return (
                <tr key={product.localId} className="hover:bg-surface-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-mono text-content-primary">{product.sku}</td>
                  <td className="px-4 py-3 text-sm text-content-primary">{product.name}</td>
                  <td className="px-4 py-3 text-sm text-content-secondary">{categoryName}</td>
                  <td className="px-4 py-3 text-sm text-content-secondary">{product.unitOfMeasure ?? "unidad"}</td>
                  <td className="px-4 py-3 text-sm text-right text-content-primary">
                    {priceUsd ? `$${priceUsd.toFixed(2)}` : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-content-secondary">
                    {priceBsFormatted.bs}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {product.isTaxable && (
                        <Badge variant="success">
                          <Receipt className="w-3 h-3 mr-1" />
                          IVA
                        </Badge>
                      )}
                      {product.isWeighted && (
                        <Badge variant="info">
                          <Scale className="w-3 h-3 mr-1" />
                          Pesable
                        </Badge>
                      )}
                      {product.visible && (
                        <Badge variant="info">
                          <Eye className="w-3 h-3 mr-1" />
                          Visible
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); onEdit(product); }}
                        className="p-1.5 rounded-lg text-content-tertiary hover:text-brand-600 hover:bg-brand-50 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onPrice(product); }}
                        className="p-1.5 rounded-lg text-content-tertiary hover:text-state-success hover:bg-green-50 transition-colors"
                        title="Precios"
                      >
                        <DollarSign className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDelete(product); }}
                        className="p-1.5 rounded-lg text-content-tertiary hover:text-state-error hover:bg-red-50 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
