import { Check } from "lucide-react";
import { Modal } from "@/common/components/Modal";
import { LoadingSpinner } from "@/common/components/EmptyState";
import type { Product } from "@/features/products/types/products.types";

interface PresentationFormProps {
  isOpen: boolean;
  onClose: () => void;
  form: {
    productLocalId: string;
    name: string;
    factor: string;
    isDefault: boolean;
  };
  onChange: (form: PresentationFormProps["form"]) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  errors: Record<string, string>;
  products: Product[];
}

export function PresentationForm({
  isOpen,
  onClose,
  form,
  onChange,
  onSubmit,
  isSubmitting,
  errors,
  products
}: PresentationFormProps) {
  const activeProducts = products.filter(p => !p.deletedAt);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nueva Presentación"
      size="sm"
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
      <div className="space-y-4">
        <div>
          <label className="label">Producto *</label>
          <select
            value={form.productLocalId}
            onChange={(e) => onChange({ ...form, productLocalId: e.target.value, isDefault: false })}
            className="input"
          >
            <option value="">Selecciona un producto</option>
            {activeProducts.map((prod) => (
              <option key={prod.localId} value={prod.localId}>{prod.name} ({prod.sku})</option>
            ))}
          </select>
          {errors.productLocalId && <p className="text-sm text-state-error mt-1">{errors.productLocalId}</p>}
        </div>

        <div>
          <label className="label">Nombre *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => onChange({ ...form, name: e.target.value })}
            placeholder="Ej: 1kg, 500ml, 2L"
            className="input"
          />
          {errors.name && <p className="text-sm text-state-error mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="label">Factor de conversión *</label>
          <input
            type="number"
            value={form.factor}
            onChange={(e) => onChange({ ...form, factor: e.target.value })}
            placeholder="1"
            step="0.0001"
            min="0.0001"
            className="input"
          />
          <p className="text-xs text-content-tertiary mt-1">Cantidad de unidades base que representa esta presentación</p>
          {errors.factor && <p className="text-sm text-state-error mt-1">{errors.factor}</p>}
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isDefault}
            onChange={(e) => onChange({ ...form, isDefault: e.target.checked })}
            className="w-4 h-4 rounded border-surface-300 text-brand-500"
          />
          <span className="text-sm text-content-primary">Presentación por defecto</span>
        </label>

        {errors.submit && <div className="alert alert-error">{errors.submit}</div>}
      </div>
    </Modal>
  );
}