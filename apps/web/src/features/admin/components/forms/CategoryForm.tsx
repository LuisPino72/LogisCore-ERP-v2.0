/**
 * Formulario de categoría global.
 */

import { Button, Input, Select, Card } from "@/common";
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
    <Card>
      <div className="card-header">
        <h2 className="font-semibold">
          {isEditing ? "Editar Categoría" : "Nueva Categoría Global"}
        </h2>
      </div>
      <div className="card-body">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label">Nombre</label>
            <Input
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Ej. Abarrotes y Víveres"
              required
            />
          </div>
          <div>
            <label className="label">Tipo de Negocio</label>
            <Select
              value={businessTypeId}
              onChange={onBusinessTypeChange}
              options={businessTypes.map(bt => ({ label: bt.name, value: bt.id }))}
              placeholder="Seleccionar..."
              required
            />
          </div>
          <div className="flex gap-3">
            <Button type="submit" variant="primary">
              {isEditing ? "Guardar Cambios" : "Crear Categoría"}
            </Button>
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
}