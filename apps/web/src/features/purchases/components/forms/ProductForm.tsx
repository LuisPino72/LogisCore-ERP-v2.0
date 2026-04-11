import { Check } from "lucide-react";
import { Modal } from "@/common/components/Modal";
import { LoadingSpinner } from "@/common/components/EmptyState";
import { FormField, Select, Input } from "@/common";
import type { Category } from "@/features/products/types/products.types";
import type { Supplier } from "../../types/purchases.types";

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  form: {
    name: string;
    sku: string;
    categoryId: string;
    isTaxable: boolean;
    isWeighted: boolean;
    unitOfMeasure: string;
    defaultPresentationId: string;
    preferredSupplierLocalId: string;
  };
  onChange: (form: ProductFormProps["form"]) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  errors: Record<string, string>;
  categories: Category[];
  suppliers: Supplier[];
}

const unitOptions = [
  { value: "unidad", label: "Unidad" },
  { value: "kg", label: "Kilogramo (kg)" },
  { value: "lt", label: "Litro (lt)" },
  { value: "m", label: "Metro (m)" }
];

export function ProductForm({
  isOpen,
  onClose,
  form,
  onChange,
  onSubmit,
  isSubmitting,
  errors,
  categories,
  suppliers
}: ProductFormProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nuevo Producto"
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn btn-secondary">
            Cancelar
          </button>
          <button onClick={onSubmit} disabled={isSubmitting} className="btn btn-primary">
            {isSubmitting ? <LoadingSpinner size="sm" /> : <><Check className="w-4 h-4" /> Crear</>}
          </button>
        </>
      }
    >
      <div className="space-y-6">
        <fieldset>
          <legend className="label mb-3">Información General</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Nombre" htmlFor="productName" required>
              <Input
                id="productName"
                type="text"
                value={form.name}
                onChange={(e) => onChange({ ...form, name: e.target.value })}
                placeholder="Nombre del producto"
                maxLength={25}
              />
              <p className="text-xs text-content-tertiary mt-1">{form.name.length}/25 caracteres</p>
              {errors.name && <p className="text-sm text-state-error mt-1">{errors.name}</p>}
            </FormField>
            <FormField label="SKU" htmlFor="productSku" required>
              <Input
                id="productSku"
                type="text"
                value={form.sku}
                onChange={(e) => onChange({ ...form, sku: e.target.value.toUpperCase() })}
                placeholder="COD-001"
                className="font-mono"
              />
              {errors.sku && <p className="text-sm text-state-error mt-1">{errors.sku}</p>}
            </FormField>
            <div className="md:col-span-2">
              <FormField label="Categoría" htmlFor="productCategory">
                <Select
                  value={form.categoryId}
                  onChange={(value) => onChange({ ...form, categoryId: String(value) })}
                  options={categories.filter(c => !c.deletedAt).map((cat) => ({ value: cat.localId, label: cat.name }))}
                  placeholder="Sin categoría"
                />
              </FormField>
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend className="label mb-3">Atributos Técnicos</legend>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isTaxable}
                onChange={(e) => onChange({ ...form, isTaxable: e.target.checked })}
                className="w-4 h-4 rounded border-surface-300 text-brand-500"
              />
              <span className="text-sm text-content-primary">Gravable con IVA</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isWeighted}
                onChange={(e) => onChange({ ...form, isWeighted: e.target.checked })}
                className="w-4 h-4 rounded border-surface-300 text-brand-500"
              />
              <span className="text-sm text-content-primary">Producto pesable (maneja 4 decimales)</span>
            </label>
            {form.isWeighted && (
              <div className="ml-7 p-3 bg-surface-50 rounded-lg border border-surface-200">
                <p className="text-xs text-content-secondary">Para productos pesables, usa 4 decimales para precisión (ej: 0.2500 kg)</p>
              </div>
            )}
            <FormField label="Unidad de medida" htmlFor="productUnit">
              <Select
                value={form.unitOfMeasure}
                onChange={(value) => onChange({ ...form, unitOfMeasure: String(value) })}
                options={unitOptions}
              />
            </FormField>
          </div>
        </fieldset>

        <fieldset>
          <legend className="label mb-3">Inventario</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Proveedor preferido" htmlFor="productSupplier">
              <Select
                value={form.preferredSupplierLocalId}
                onChange={(value) => onChange({ ...form, preferredSupplierLocalId: String(value) })}
                options={suppliers.filter(s => s.isActive).map(s => ({ value: s.localId, label: s.name }))}
                placeholder="Sin proveedor"
              />
            </FormField>
            <FormField label="Presentación por defecto" htmlFor="productPresentation">
              <Select
                value={form.defaultPresentationId}
                onChange={(value) => onChange({ ...form, defaultPresentationId: String(value) })}
                options={[]}
                placeholder="Sin presentación"
              />
            </FormField>
          </div>
        </fieldset>

        {errors.submit && <div className="alert alert-error">{errors.submit}</div>}
      </div>
    </Modal>
  );
}