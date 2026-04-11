import { Plus, Package } from "lucide-react";
import { EmptyState, LoadingSpinner } from "@/common/components/EmptyState";
import { Badge } from "@/common/components/Badge";
import type { Category, Product } from "@/features/products/types/products.types";

interface ProductTableProps {
  products: Product[];
  categories: Category[];
  isLoading: boolean;
  onAddNew: () => void;
}

export function ProductTable({ products, categories, isLoading, onAddNew }: ProductTableProps) {
  const getCategoryName = (categoryId: string | null | undefined) => {
    if (!categoryId) return "-";
    const cat = categories.find(c => c.localId === categoryId);
    return cat?.name || "-";
  };

  if (isLoading) {
    return (
      <div className="card">
        <div className="card-body">
          <LoadingSpinner message="Cargando productos..." />
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="card">
        <div className="card-body">
          <EmptyState
            icon={<Package className="w-12 h-12" />}
            title="No hay productos"
            description="Crea el primer producto para el catálogo"
            action={
              <button onClick={onAddNew} className="btn btn-primary">
                <Plus className="w-4 h-4" /> Nuevo Producto
              </button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-body">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-100 border-b border-surface-200">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-content-secondary">Nombre</th>
                <th className="px-3 py-2 text-left font-medium text-content-secondary">SKU</th>
                <th className="px-3 py-2 text-left font-medium text-content-secondary">Categoría</th>
                <th className="px-3 py-2 text-left font-medium text-content-secondary">Tipo</th>
                <th className="px-3 py-2 text-left font-medium text-content-secondary">IVA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {products.map((product) => (
                <tr key={product.localId} className="hover:bg-surface-50">
                  <td className="px-3 py-2 text-content-primary">{product.name}</td>
                  <td className="px-3 py-2 font-mono text-xs">{product.sku}</td>
                  <td className="px-3 py-2 text-content-secondary">{getCategoryName(product.categoryId)}</td>
                  <td className="px-3 py-2">
                    {product.isWeighted ? <Badge variant="info">Pesable</Badge> : <Badge variant="default">Unitario</Badge>}
                  </td>
                  <td className="px-3 py-2">
                    {product.isTaxable ? <Badge variant="warning">Gravable</Badge> : <Badge variant="default">Exento</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}