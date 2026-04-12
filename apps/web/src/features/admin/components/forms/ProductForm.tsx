/**
 * Formulario de producto global.
 */

import type { GlobalProductPresentation, BusinessType, CreateGlobalProductInput } from "../../types/admin.types";

const UNIT_OPTIONS = [
  { value: "unidad", label: "Unidad" },
  { value: "kilogramo", label: "Kilogramo (kg)" },
  { value: "gramo", label: "Gramo (g)" },
  { value: "litro", label: "Litro (L)" },
  { value: "mililitro", label: "Mililitro (ml)" },
  { value: "metro", label: "Metro (m)" },
  { value: "centimetro", label: "Centímetro (cm)" },
];

interface ProductFormProps {
  form: CreateGlobalProductInput;
  businessTypes: BusinessType[];
  categories: { id: string; name: string; businessTypeId: string }[];
  isEditing: boolean;
  onChange: (field: keyof CreateGlobalProductInput, value: unknown) => void;
  onAddPresentation: () => void;
  onRemovePresentation: (index: number) => void;
  onUpdatePresentation: (index: number, field: keyof GlobalProductPresentation, value: unknown) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export function ProductForm({ 
  form, 
  businessTypes, 
  categories,
  isEditing,
  onChange, 
  onAddPresentation,
  onRemovePresentation,
  onUpdatePresentation,
  onSubmit,
  onCancel
}: ProductFormProps) {
  const filteredCategories = categories.filter(c => c.businessTypeId === form.businessTypeId);

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="font-semibold">
          {isEditing ? "Editar Producto" : "Nuevo Producto Global"}
        </h2>
      </div>
      <div className="card-body">
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Nombre del Producto</label>
              <input
                type="text"
                className="input"
                value={form.name}
                onChange={(e) => onChange("name", e.target.value)}
                placeholder="Ej. Arroz Premium"
                required
              />
            </div>
            <div>
              <label className="label">SKU</label>
              <input
                type="text"
                className="input"
                value={form.sku}
                onChange={(e) => onChange("sku", e.target.value)}
                placeholder="Ej. ARR-001"
                required
              />
            </div>
          </div>

          <div>
            <label className="label">Descripción</label>
            <textarea
              className="input min-h-[60px]"
              value={form.description || ""}
              onChange={(e) => onChange("description", e.target.value)}
              placeholder="Descripción opcional..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Tipo de Negocio</label>
              <select
                className="input"
                value={form.businessTypeId}
                onChange={(e) => {
                  onChange("businessTypeId", e.target.value);
                  onChange("categoryId", "");
                }}
                required
              >
                <option value="">Seleccionar...</option>
                {businessTypes.map(bt => (
                  <option key={bt.id} value={bt.id}>{bt.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Categoría</label>
              <select
                className="input"
                value={form.categoryId || ""}
                onChange={(e) => onChange("categoryId", e.target.value)}
              >
                <option value="">Seleccionar...</option>
                {filteredCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <h3 className="font-medium mb-4">Características</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isWeighted"
                  checked={form.isWeighted}
                  onChange={(e) => onChange("isWeighted", e.target.checked)}
                  className="checkbox"
                />
                <label htmlFor="isWeighted" className="text-sm">¿Es pesable?</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isTaxable"
                  checked={form.isTaxable}
                  onChange={(e) => onChange("isTaxable", e.target.checked)}
                  className="checkbox"
                />
                <label htmlFor="isTaxable" className="text-sm">¿Es grabable?</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isSerialized"
                  checked={form.isSerialized}
                  onChange={(e) => onChange("isSerialized", e.target.checked)}
                  className="checkbox"
                />
                <label htmlFor="isSerialized" className="text-sm">¿Tiene serie?</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="visible"
                  checked={form.visible}
                  onChange={(e) => onChange("visible", e.target.checked)}
                  className="checkbox"
                />
                <label htmlFor="visible" className="text-sm">Visible</label>
              </div>
            </div>
            <div className="mt-4">
              <label className="label">Unidad de Medida</label>
              <select
                className="input"
                value={form.unitOfMeasure}
                onChange={(e) => onChange("unitOfMeasure", e.target.value)}
              >
                {UNIT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium">Presentaciones</h3>
              <button type="button" onClick={onAddPresentation} className="btn btn-secondary text-sm">
                + Agregar Presentación
              </button>
            </div>
            <div className="space-y-3">
              {form.presentations.map((pres, index) => (
                <div key={index} className="flex gap-3 items-end bg-surface-50 p-3 rounded">
                  <div className="flex-1">
                    <label className="label text-xs">Nombre</label>
                    <input
                      type="text"
                      className="input"
                      value={pres.name}
                      onChange={(e) => onUpdatePresentation(index, "name", e.target.value)}
                      placeholder="Ej. 500ml, 1kg"
                      required
                    />
                  </div>
                  <div className="w-24">
                    <label className="label text-xs">Factor</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      value={isNaN(pres.factor) ? "" : pres.factor}
                      onChange={(e) => onUpdatePresentation(index, "factor", e.target.value === "" ? 0 : parseFloat(e.target.value))}
                      required
                    />
                  </div>
                  <div className="w-32">
                    <label className="label text-xs">Precio</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      value={isNaN(pres.price) ? "" : pres.price}
                      onChange={(e) => onUpdatePresentation(index, "price", e.target.value === "" ? 0 : parseFloat(e.target.value))}
                      required
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={pres.isDefault}
                      onChange={(e) => onUpdatePresentation(index, "isDefault", e.target.checked)}
                      className="checkbox"
                      id={`default-${index}`}
                    />
                    <label htmlFor={`default-${index}`} className="text-xs">Default</label>
                  </div>
                  {form.presentations.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onRemovePresentation(index)}
                      className="text-state-error hover:text-state-error/70"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="submit" className="btn btn-primary">
              {isEditing ? "Guardar Cambios" : "Crear Producto"}
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