import { Check } from "lucide-react";
import { Modal } from "@/common/components/Modal";
import { Button } from "@/common/components/Button";
import { LoadingSpinner } from "@/common/components/EmptyState";
import { Select } from "@/common/components/Select";
import { Input } from "@/common/components/FormField";
import { Checkbox } from "@/common/components/Checkbox";
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
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? <LoadingSpinner size="sm" /> : <><Check className="w-4 h-4" /> Crear</>}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">Producto *</label>
          <Select
            value={form.productLocalId}
            onChange={(value) => onChange({ ...form, productLocalId: value, isDefault: false })}
            options={activeProducts.map((prod) => ({ value: prod.localId, label: `${prod.name} (${prod.sku})` }))}
            placeholder="Selecciona un producto"
            error={errors.productLocalId}
          />
        </div>

        <div>
          <label className="label">Nombre *</label>
          <Input
            value={form.name}
            onChange={(e) => onChange({ ...form, name: e.target.value })}
            placeholder="Ej: 1kg, 500ml, 2L"
            error={errors.name}
          />
        </div>

        <div>
          <label className="label">Factor de conversión *</label>
          <Input
            type="number"
            value={form.factor}
            onChange={(e) => onChange({ ...form, factor: e.target.value })}
            placeholder="1"
            step="0.0001"
            min="0.0001"
            error={errors.factor}
          />
          <p className="text-xs text-content-tertiary mt-1">Cantidad de unidades base que representa esta presentación</p>
        </div>

        <Checkbox
          checked={form.isDefault}
          onChange={(e) => onChange({ ...form, isDefault: e.target.checked })}
          label="Presentación por defecto"
        />

        {errors.submit && <div className="alert alert-error">{errors.submit}</div>}
      </div>
    </Modal>
  );
}