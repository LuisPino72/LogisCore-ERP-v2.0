import type { Product } from "@/features/products/types/products.types";
import type { Warehouse } from "../../types/inventory.types";

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
        <label className="label">Cantidad Contada *</label>
        <input 
          type="number"
          step="0.0001"
          min="0"
          value={form.countedQty}
          onChange={(e) => onChange({ ...form, countedQty: Number(e.target.value) })}
          className="input"
        />
      </div>
      <div>
        <label className="label">Razón / Observación</label>
        <textarea 
          value={form.reason}
          onChange={(e) => onChange({ ...form, reason: e.target.value })}
          placeholder="Motivo del conteo..."
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
          Crear Conteo
        </button>
      </div>
    </div>
  );
}