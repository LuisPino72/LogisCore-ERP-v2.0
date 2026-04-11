import type { StockMovementType } from "../../types/inventory.types";
import type { Product } from "@/features/products/types/products.types";
import type { Warehouse } from "../../types/inventory.types";

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
      <div>
        <label className="label">Producto *</label>
        <select 
          value={form.productLocalId}
          onChange={(e) => onChange({ ...form, productLocalId: e.target.value })}
          className="input"
        >
          <option value="">Seleccionar producto</option>
          {products.map(p => (
            <option key={p.localId} value={p.localId}>{p.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Bodega *</label>
        <select 
          value={form.warehouseLocalId}
          onChange={(e) => onChange({ ...form, warehouseLocalId: e.target.value })}
          className="input"
        >
          <option value="">Seleccionar bodega</option>
          {warehouses.map(w => (
            <option key={w.localId} value={w.localId}>{w.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Tipo de Movimiento *</label>
        <select 
          value={form.movementType}
          onChange={(e) => onChange({ ...form, movementType: e.target.value as StockMovementType })}
          className="input"
        >
          {Object.entries(movementTypeLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Cantidad *</label>
        <input 
          type="number"
          step="0.0001"
          min="0.0001"
          value={form.quantity}
          onChange={(e) => onChange({ ...form, quantity: Number(e.target.value) })}
          className="input"
        />
      </div>
      <div>
        <label className="label">Notas (obligatorio para ajustes)</label>
        <textarea 
          value={form.notes}
          onChange={(e) => onChange({ ...form, notes: e.target.value })}
          placeholder="Motivo del movimiento..."
          className="input min-h-[80px]"
        />
      </div>
      <div className="flex justify-end gap-3">
        <button 
          onClick={onCancel}
          className="btn btn-secondary"
        >
          Cancelar
        </button>
        <button 
          onClick={onSubmit}
          disabled={!isValid}
          className="btn btn-primary"
        >
          Registrar
        </button>
      </div>
    </div>
  );
}