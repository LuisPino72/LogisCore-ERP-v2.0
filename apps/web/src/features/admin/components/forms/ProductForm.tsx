/**
 * Formulario de producto global.
 */

import { Button, Input, Select, Checkbox, Card, Textarea } from "@/common";
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
    <Card>
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
              <Input
                type="text"
                value={form.name}
                onChange={(e) => onChange("name", e.target.value)}
                placeholder="Ej. Arroz Premium"
                required
              />
            </div>
            <div>
              <label className="label">SKU</label>
              <Input
                type="text"
                value={form.sku}
                onChange={(e) => onChange("sku", e.target.value)}
                placeholder="Ej. ARR-001"
                required
              />
            </div>
          </div>

          <div>
            <label className="label">Descripción</label>
            <Textarea
              className="min-h-[60px]"
              value={form.description || ""}
              onChange={(e) => onChange("description", e.target.value)}
              placeholder="Descripción opcional..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Tipo de Negocio</label>
              <Select
                value={form.businessTypeId}
                onChange={(val) => {
                  onChange("businessTypeId", val);
                  onChange("categoryId", "");
                }}
                options={businessTypes.map(bt => ({ label: bt.name, value: bt.id }))}
                placeholder="Seleccionar..."
                required
              />
            </div>
            <div>
              <label className="label">Categoría</label>
              <Select
                value={form.categoryId || ""}
                onChange={(val) => onChange("categoryId", val)}
                options={filteredCategories.map(cat => ({ label: cat.name, value: cat.id }))}
                placeholder="Seleccionar..."
              />
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <h3 className="font-medium mb-4">Características</h3>
            <div className="grid grid-cols-4 gap-4">
              <Checkbox
                label="¿Es pesable?"
                checked={form.isWeighted}
                onChange={(checked) => onChange("isWeighted", checked)}
              />
              <Checkbox
                label="¿Es grabable?"
                checked={form.isTaxable}
                onChange={(checked) => onChange("isTaxable", checked)}
              />
              <Checkbox
                label="¿Tiene serie?"
                checked={form.isSerialized}
                onChange={(checked) => onChange("isSerialized", checked)}
              />
              <Checkbox
                label="Visible"
                checked={form.visible}
                onChange={(checked) => onChange("visible", checked)}
              />
            </div>
            <div className="mt-4">
              <label className="label">Unidad de Medida</label>
              <Select
                value={form.unitOfMeasure}
                onChange={(val) => onChange("unitOfMeasure", val)}
                options={UNIT_OPTIONS}
              />
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium">Presentaciones</h3>
              <Button variant="secondary" size="sm" onClick={onAddPresentation}>
                + Agregar Presentación
              </Button>
            </div>
            <div className="space-y-3">
              {form.presentations.map((pres, index) => (
                <div key={index} className="bg-surface-50 p-3 rounded space-y-3">
                  <div className="w-full">
                    <label className="label text-xs">Nombre</label>
                    <Input
                      type="text"
                      value={pres.name}
                      onChange={(e) => onUpdatePresentation(index, "name", e.target.value)}
                      placeholder="Ej. 500ml, 1kg"
                      required
                      className="w-full"
                    />
                  </div>
                  <div className="flex gap-3 items-end">
                    <div className="w-24">
                      <label className="label text-xs">Factor</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={isNaN(pres.factor) ? "" : pres.factor}
                        onChange={(e) => onUpdatePresentation(index, "factor", e.target.value === "" ? 0 : parseFloat(e.target.value))}
                        required
                      />
                    </div>
                    <div className="w-32">
                      <label className="label text-xs">Precio</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={isNaN(pres.price) ? "" : pres.price}
                        onChange={(e) => onUpdatePresentation(index, "price", e.target.value === "" ? 0 : parseFloat(e.target.value))}
                        required
                      />
                    </div>
                    <div className="flex items-center pb-1">
                      <Checkbox
                        label="Default"
                        checked={pres.isDefault}
                        onChange={(checked) => onUpdatePresentation(index, "isDefault", checked)}
                      />
                    </div>
                    {form.presentations.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemovePresentation(index)}
                        className="text-state-error hover:bg-state-error/10 pb-1"
                      >
                        ✕
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" variant="primary">
              {isEditing ? "Guardar Cambios" : "Crear Producto"}
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