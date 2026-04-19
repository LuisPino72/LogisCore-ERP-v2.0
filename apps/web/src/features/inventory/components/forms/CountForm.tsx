import type { Product } from "@/features/products/types/products.types";
import type { Warehouse } from "../../types/inventory.types";
import { Button } from "@/common/components/Button";
import { FormField, Select, Input } from "@/common";

interface CountFormProps {
  products: Product[];
  warehouses: Warehouse[];
  form: {
    productLocalId: string;
    warehouseLocalId: string;
    countedQty: number;
    reason?: string;
  };
  onChange: (form: CountFormProps["form"]) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function CountForm({
  products,
  warehouses,
  form,
  onChange,
  onSubmit,
  onCancel
}: CountFormProps) {
  const isValid = form.productLocalId && form.warehouseLocalId;

  return (
    <div className="space-y-4">
      <FormField label="Producto" htmlFor="productLocalId" required>
        <Select
          value={form.productLocalId}
          onChange={(value) => onChange({ ...form, productLocalId: String(value) })}
          options={products.map(p => ({ value: p.localId, label: p.name }))}
          placeholder="Seleccionar producto"
        />
      </FormField>
      <FormField label="Bodega" htmlFor="warehouseLocalId" required>
        <Select
          value={form.warehouseLocalId}
          onChange={(value) => onChange({ ...form, warehouseLocalId: String(value) })}
          options={warehouses.map(w => ({ value: w.localId, label: w.name }))}
          placeholder="Seleccionar bodega"
        />
      </FormField>
      <FormField label="Cantidad Contada" htmlFor="countedQty" required>
        <Input
          id="countedQty"
          type="number"
          step="0.0001"
          min="0"
          value={form.countedQty}
          onChange={(e) => onChange({ ...form, countedQty: Number(e.target.value) })}
        />
      </FormField>
      <FormField label="Razón / Observación" htmlFor="reason">
        <textarea 
          id="reason"
          value={form.reason}
          onChange={(e) => onChange({ ...form, reason: e.target.value })}
          placeholder="Motivo del conteo..."
          className="input min-h-[80px]"
        />
      </FormField>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={onSubmit} disabled={!isValid}>
          Crear Conteo
        </Button>
      </div>
    </div>
  );
}