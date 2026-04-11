/**
 * Lista de categorías globales.
 */

import type { GlobalCategory } from "../../types/admin.types";

interface CategoryListProps {
  categories: GlobalCategory[];
  isLoading: boolean;
  selectedBusinessType: string;
  onEdit: (category: GlobalCategory) => void;
  onDelete: (category: GlobalCategory) => void;
}

export function CategoryList({ categories, isLoading, selectedBusinessType, onEdit, onDelete }: CategoryListProps) {
  if (isLoading) {
    return <div className="text-center py-8 text-content-secondary">Cargando...</div>;
  }

  if (categories.length === 0) {
    return (
      <div className="text-center py-8 text-content-secondary">
        No hay categorías globales{selectedBusinessType ? " para este tipo de negocio" : ""}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {categories.map(cat => (
        <div key={cat.id} className="card">
          <div className="card-body flex justify-between items-center">
            <div>
              <h3 className="font-medium text-content-primary">{cat.name}</h3>
              <span className="text-sm text-content-secondary">{cat.businessTypeName}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(cat)}
                className="text-brand-600 hover:text-brand-700 text-sm"
              >
                Editar
              </button>
              <button
                onClick={() => onDelete(cat)}
                className="text-state-error hover:text-red-700 text-sm"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}