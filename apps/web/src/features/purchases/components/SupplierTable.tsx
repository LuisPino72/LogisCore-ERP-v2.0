import { Plus, Building2, Edit2 } from "lucide-react";
import { EmptyState, LoadingSpinner } from "@/common/components/EmptyState";
import { Badge } from "@/common/components/Badge";
import type { Supplier } from "../types/purchases.types";

interface SupplierTableProps {
  suppliers: Supplier[];
  isLoading: boolean;
  onAddNew: () => void;
  onEdit: (supplier: Supplier) => void;
}

export function SupplierTable({ suppliers, isLoading, onAddNew, onEdit }: SupplierTableProps) {
  if (isLoading) {
    return (
      <div className="card">
        <div className="card-body">
          <LoadingSpinner message="Cargando proveedores..." />
        </div>
      </div>
    );
  }

  if (suppliers.length === 0) {
    return (
      <div className="card">
        <div className="card-body">
          <EmptyState
            icon={<Building2 className="w-12 h-12" />}
            title="No hay proveedores"
            description="Crea tu primer proveedor para comenzar"
            action={
              <button onClick={onAddNew} className="btn btn-primary">
                <Plus className="w-4 h-4" /> Nuevo Proveedor
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
                <th className="px-3 py-2 text-left font-medium text-content-secondary">RIF</th>
                <th className="px-3 py-2 text-left font-medium text-content-secondary">Teléfono</th>
                <th className="px-3 py-2 text-left font-medium text-content-secondary">Contacto</th>
                <th className="px-3 py-2 text-left font-medium text-content-secondary">Estado</th>
                <th className="px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {suppliers.map((supplier) => (
                <tr key={supplier.localId} className="hover:bg-surface-50">
                  <td className="px-3 py-2 text-content-primary">{supplier.name}</td>
                  <td className="px-3 py-2 font-mono text-xs">{supplier.rif || "-"}</td>
                  <td className="px-3 py-2 text-content-secondary">{supplier.phone || "-"}</td>
                  <td className="px-3 py-2 text-content-secondary">{supplier.contactPerson || "-"}</td>
                  <td className="px-3 py-2">
                    <Badge variant={supplier.isActive ? "success" : "default"}>
                      {supplier.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    <button onClick={() => onEdit(supplier)} className="p-1 hover:text-brand-500 transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
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