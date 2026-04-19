import { Plus, Box } from "lucide-react";
import { EmptyState, LoadingSpinner } from "@/common/components/EmptyState";
import { Button } from "@/common/components/Button";
import { Badge } from "@/common/components/Badge";
import type { Product, ProductPresentation } from "@/features/products/types/products.types";

interface PresentationTableProps {
  presentations: ProductPresentation[];
  products: Product[];
  isLoading: boolean;
  onAddNew: () => void;
}

export function PresentationTable({ presentations, products, isLoading, onAddNew }: PresentationTableProps) {
  const getProductName = (productLocalId: string) => {
    const prod = products.find(p => p.localId === productLocalId);
    return prod?.name || productLocalId;
  };

  if (isLoading) {
    return (
      <div className="card">
        <div className="card-body">
          <LoadingSpinner message="Cargando presentaciones..." />
        </div>
      </div>
    );
  }

  if (presentations.length === 0) {
    return (
      <div className="card">
        <div className="card-body">
          <EmptyState
            icon={<Box className="w-12 h-12" />}
            title="No hay presentaciones"
            description="Crea presentaciones para tus productos (ej: 1kg, 500ml)"
            action={
              <Button variant="primary" onClick={onAddNew}>
                <Plus className="w-4 h-4" /> Nueva Presentación
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
                <th className="px-3 py-2 text-left font-medium text-content-secondary">Nombre</th>
                <th className="px-3 py-2 text-left font-medium text-content-secondary">Producto</th>
                <th className="px-3 py-2 text-left font-medium text-content-secondary">Factor</th>
                <th className="px-3 py-2 text-left font-medium text-content-secondary">Por defecto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {presentations.map((pres) => (
                <tr key={pres.id} className="hover:bg-surface-50">
                  <td className="px-3 py-2 text-content-primary">{pres.name}</td>
                  <td className="px-3 py-2 text-content-secondary">{getProductName(pres.productLocalId)}</td>
                  <td className="px-3 py-2 font-mono text-xs">{pres.factor?.toFixed(4) || "-"}</td>
                  <td className="px-3 py-2">
                    {pres.isDefault ? <Badge variant="success">Default</Badge> : <span className="text-content-tertiary">-</span>}
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