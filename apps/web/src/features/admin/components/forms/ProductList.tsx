/**
 * Lista de productos globales.
 */

import type { GlobalProduct } from "../../types/admin.types";

interface ProductListProps {
  products: GlobalProduct[];
  isLoading: boolean;
  selectedBusinessType: string;
  onEdit: (product: GlobalProduct) => void;
  onDelete: (product: GlobalProduct) => void;
}

export function ProductList({ products, isLoading, selectedBusinessType, onEdit, onDelete }: ProductListProps) {
  if (isLoading) {
    return <div className="text-center py-8 text-content-secondary">Cargando...</div>;
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-8 text-content-secondary">
        No hay productos globales{selectedBusinessType ? " para este tipo de negocio" : ""}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {products.map(prod => (
        <div key={prod.id} className="card">
          <div className="card-body">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium text-content-primary">{prod.name}</h3>
                <p className="text-sm text-content-secondary">
                  SKU: {prod.sku} | {prod.businessTypeName} | {prod.unitOfMeasure}
                </p>
                <div className="flex gap-2 mt-1">
                  {prod.isWeighted && <span className="tag tag-info text-xs">Pesable</span>}
                  {prod.isTaxable && <span className="tag tag-success text-xs">Grabable</span>}
                  {prod.isSerialized && <span className="tag tag-warning text-xs">Con serie</span>}
                </div>
                <div className="mt-2 text-sm text-content-secondary">
                  Presentaciones: {prod.presentations.map(p => `${p.name} ($${p.price})`).join(", ")}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onEdit(prod)}
                  className="text-brand-600 hover:text-brand-700 text-sm"
                >
                  Editar
                </button>
                <button
                  onClick={() => onDelete(prod)}
                  className="text-state-error hover:text-red-700 text-sm"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}