import { Plus, Package } from "lucide-react";
import { EmptyState, LoadingSpinner } from "@/common/components/EmptyState";
import { Button } from "@/common/components/Button";
import type { Category } from "@/features/products/types/products.types";

interface CategoryTableProps {
  categories: Category[];
  isLoading: boolean;
  onAddNew: () => void;
}

interface Column {
  key: string;
  header: string;
  render?: (row: Category) => React.ReactNode;
}

export function CategoryTable({ categories, isLoading, onAddNew }: CategoryTableProps) {
  const columns: Column[] = [
    { key: "name", header: "Nombre" },
    { key: "createdAt", header: "Creado", render: (row: Category) => 
      row.createdAt ? new Date(row.createdAt).toLocaleDateString("es-VE") : "-"
    }
  ];

  if (isLoading) {
    return (
      <div className="card">
        <div className="card-body">
          <LoadingSpinner message="Cargando categorías..." />
        </div>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="card">
        <div className="card-body">
          <EmptyState
            icon={<Package className="w-12 h-12" />}
            title="No hay categorías"
            description="Crea la primera categoría para organizar tus productos"
            action={
              <Button variant="primary" onClick={onAddNew}>
                <Plus className="w-4 h-4" /> Nueva Categoría
              </Button>
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
                {columns.map((col) => (
                  <th key={col.key} className="px-3 py-2 text-left font-medium text-content-secondary">
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {categories.map((row) => (
                <tr key={row.localId} className="hover:bg-surface-50">
                  {columns.map((col) => (
                    <td key={col.key} className="px-3 py-2 text-content-primary">
                      {col.render ? col.render(row) : String(row[col.key as keyof Category] ?? "-")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}