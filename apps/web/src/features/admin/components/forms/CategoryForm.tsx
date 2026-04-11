/**
 * Formulario de categoría global.
 */

import type { BusinessType } from "../../types/admin.types";

interface CategoryFormProps {
  name: string;
  businessTypeId: string;
  businessTypes: BusinessType[];
  isEditing: boolean;
  onNameChange: (name: string) => void;
  onBusinessTypeChange: (businessTypeId: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export function CategoryForm({ 
  name, 
  businessTypeId, 
  businessTypes, 
  isEditing,
  onNameChange, 
  onBusinessTypeChange,
  onSubmit,
  onCancel
}: CategoryFormProps) {
  return (
    <div className="card">
      <div className="card-header">
        <h2 className="font-semibold">
          {isEditing ? "Editar Categoría" : "Nueva Categoría Global"}
        </h2>
      </div>
      <div className="card-body">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label">Nombre</label>
            <input
              type="text"
              className="input"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Ej. Abarrotes y Víveres"
              required
            />
          </div>
          <div>
            <label className="label">Tipo de Negocio</label>
            <select
              className="input"
              value={businessTypeId}
              onChange={(e) => onBusinessTypeChange(e.target.value)}
              required
            >
              <option value="">Seleccionar...</option>
              {businessTypes.map(bt => (
                <option key={bt.id} value={bt.id}>{bt.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
            <button type="submit" className="btn btn-primary">
              {isEditing ? "Guardar Cambios" : "Crear Categoría"}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}