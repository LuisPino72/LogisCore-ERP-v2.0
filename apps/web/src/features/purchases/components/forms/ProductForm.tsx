import { Check } from "lucide-react";
import { Modal } from "@/common/components/Modal";
import { LoadingSpinner } from "@/common/components/EmptyState";
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
            <div>
              <label className="block text-sm font-medium text-content-secondary mb-1">Nombre *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => onChange({ ...form, name: e.target.value })}
                placeholder="Nombre del producto"
                className="input"
                maxLength={25}
              />
              <p className="text-xs text-content-tertiary mt-1">{form.name.length}/25 caracteres</p>
              {errors.name && <p className="text-sm text-state-error mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-content-secondary mb-1">SKU *</label>
              <input
                type="text"
                value={form.sku}
                onChange={(e) => onChange({ ...form, sku: e.target.value.toUpperCase() })}
                placeholder="COD-001"
                className="input font-mono"
              />
              {errors.sku && <p className="text-sm text-state-error mt-1">{errors.sku}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-content-secondary mb-1">Categoría</label>
              <select
                value={form.categoryId}
                onChange={(e) => onChange({ ...form, categoryId: e.target.value })}
                className="input"
              >
                <option value="">Sin categoría</option>
                {categories.filter(c => !c.deletedAt).map((cat) => (
                  <option key={cat.localId} value={cat.localId}>{cat.name}</option>
                ))}
              </select>
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
            <div>
              <label className="block text-sm font-medium text-content-secondary mb-1">Unidad de medida</label>
              <select
                value={form.unitOfMeasure}
                onChange={(e) => onChange({ ...form, unitOfMeasure: e.target.value })}
                className="input"
                disabled={!form.isWeighted}
              >
                {unitOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend className="label mb-3">Inventario</legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-content-secondary mb-1">Proveedor preferido</label>
              <select
                value={form.preferredSupplierLocalId}
                onChange={(e) => onChange({ ...form, preferredSupplierLocalId: e.target.value })}
                className="input"
              >
                <option value="">Sin proveedor</option>
                {suppliers.filter(s => s.isActive).map(s => (
                  <option key={s.localId} value={s.localId}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-content-secondary mb-1">Presentación por defecto</label>
              <select
                value={form.defaultPresentationId}
                onChange={(e) => onChange({ ...form, defaultPresentationId: e.target.value })}
                className="input"
              >
                <option value="">Sin presentación</option>
              </select>
            </div>
          </div>
        </fieldset>

        {errors.submit && <div className="alert alert-error">{errors.submit}</div>}
      </div>
    </Modal>
  );
}