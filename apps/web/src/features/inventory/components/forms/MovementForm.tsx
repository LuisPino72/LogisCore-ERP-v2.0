import type { StockMovementType } from "../../types/inventory.types";
import type { Product } from "@/features/products/types/products.types";
import type { Warehouse } from "../../types/inventory.types";
import { Button } from "@/common/components/Button";
import { FormField, Select, Textarea, Input } from "@/common";

interface MovementFormProps {
  products: Product[];
  warehouses: Warehouse[];
  form: {
    productLocalId: string;
    warehouseLocalId: string;
    movementType: StockMovementType;
    quantity: number;
    notes?: string;
  };
  onChange: (form: MovementFormProps["form"]) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

const movementTypeLabels: Record<StockMovementType, string> = {
  purchase_in: "Entrada Compra",
  sale_out: "Salida Venta",
  adjustment_in: "Ajuste Entrada",
  adjustment_out: "Ajuste Salida",
  production_in: "Entrada Producción",
  production_out: "Salida Producción",
  transfer_in: "Transferencia Entrada",
  transfer_out: "Transferencia Salida",
  count_adjustment: "Ajuste Conteo"
};

export function MovementForm({
  products,
  warehouses,
  form,
  onChange,
  onSubmit,
  onCancel
}: MovementFormProps) {
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
      <FormField label="Tipo de Movimiento" htmlFor="movementType" required>
        <Select
          value={form.movementType}
          onChange={(value) => onChange({ ...form, movementType: value as StockMovementType })}
          options={Object.entries(movementTypeLabels).map(([value, label]) => ({ value, label }))}
        />
      </FormField>
      <FormField label="Cantidad" htmlFor="quantity" required>
        <Input 
          id="quantity"
          type="number"
          step="0.0001"
          min="0.0001"
          value={form.quantity}
          onChange={(value) => onChange({ ...form, quantity: Number(value) })}
        />
      </FormField>
      <FormField label="Notas (obligatorio para ajustes)" htmlFor="notes">
        <Textarea 
          id="notes"
          value={form.notes}
          onChange={(e) => onChange({ ...form, notes: e.target.value })}
          placeholder="Motivo del movimiento..."
          className="min-h-[80px]"
        />
      </FormField>
<div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={onSubmit} disabled={!isValid}>
          Crear Movimiento
        </Button>
      </div>
    </div>
  );
}