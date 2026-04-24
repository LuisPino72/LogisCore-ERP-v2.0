/**
 * Formulario de producto global.
 */

import { Button, Input, Select, Checkbox, Card, Textarea, FormField } from "@/common";
import type { GlobalProductPresentation, BusinessType, CreateGlobalProductInput } from "../../types/admin.types";
import { DynamicAttributeBuilder } from "@/features/admin/components/forms/DynamicAttributeBuilder";
import { generateAttributeCombinations, formatVariantName } from "@/features/admin/utils/product-pro.utils";


interface ProductFormProps {
  form: CreateGlobalProductInput;
  businessTypes: BusinessType[];
  categories: { id: string; name: string; businessTypeId: string }[];
  isEditing: boolean;
  onChange: (field: keyof CreateGlobalProductInput, value: unknown) => void;
  onAddPresentation: () => void;
  onRemovePresentation: (index: number) => void;
  onUpdatePresentation: (index: number, field: keyof GlobalProductPresentation, value: unknown) => void;
  onUpdatePresentations: (presentations: GlobalProductPresentation[]) => void;
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
  onUpdatePresentations,
  onSubmit,
  onCancel
}: ProductFormProps) {
  const filteredCategories = categories.filter(c => c.businessTypeId === form.businessTypeId);

  const handleAttributeChange = (field: keyof CreateGlobalProductInput, value: unknown) => {
    onChange(field, value);

    if (field === "attributes") {
      const attrs = value as GlobalProductAttribute[];
      if (attrs.length > 0) {
        const combinations = generateAttributeCombinations(attrs);
        const newPresentations: GlobalProductPresentation[] = combinations.map((combo, index) => ({
          name: formatVariantName(combo),
          factor: 1,
          price: 0,
          isDefault: index === 0,
          barcode: "",
        }));
        onUpdatePresentations(newPresentations);
      }
    }
  };

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
              <FormField label="Nombre del Producto" required>
                <Input
                  type="text"
                  value={form.name}
                  onChange={(e) => onChange("name", e.target.value)}
                  placeholder="Ej. Arroz Premium"
                  required
                />
              </FormField>
            </div>
            <div>
              <FormField label="SKU" required>
                <Input
                  type="text"
                  value={form.sku}
                  onChange={(e) => onChange("sku", e.target.value)}
                  placeholder="Ej. ARR-001"
                  required
                />
              </FormField>
            </div>
          </div>

          <div>
            <FormField label="Descripción">
              <Textarea
                className="min-h-[60px]"
                value={form.description || ""}
                onChange={(e) => onChange("description", e.target.value)}
                placeholder="Descripción opcional..."
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <FormField label="Tipo de Negocio" required>
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
              </FormField>
            </div>
            <div>
              <FormField label="Categoría">
                <Select
                  value={form.categoryId || ""}
                  onChange={(val) => onChange("categoryId", val)}
                  options={filteredCategories.map(cat => ({ label: cat.name, value: cat.id }))}
                  placeholder="Seleccionar..."
                />
              </FormField>
            </div>
          </div>

            <DynamicAttributeBuilder
              form={form}
              onChange={handleAttributeChange}
              isWeighted={form.isWeighted}
            />

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
                      <FormField label="Nombre" required>
                        <Input
                          type="text"
                          value={pres.name}
                          onChange={(e) => onUpdatePresentation(index, "name", e.target.value)}
                          placeholder="Ej. 500ml, 1kg"
                          required
                          className="w-full"
                        />
                      </FormField>
                    </div>
                    <div className="flex gap-3 items-end">
                      <div className="w-24">
                        <FormField label="Factor" required>
                          <Input
                            type="number"
                            step="0.01"
                            value={isNaN(pres.factor) ? "" : pres.factor}
                            onChange={(e) => onUpdatePresentation(index, "factor", e.target.value === "" ? 0 : parseFloat(e.target.value))}
                            required
                          />
                        </FormField>
                      </div>
                      <div className="w-32">
                        <FormField label="Precio" required>
                          <Input
                            type="number"
                            step="0.01"
                            value={isNaN(pres.price) ? "" : pres.price}
                            onChange={(e) => onUpdatePresentation(index, "price", e.target.value === "" ? 0 : parseFloat(e.target.value))}
                            required
                          />
                        </FormField>
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
