import type { CreateWarehouseInput } from "../../types/inventory.types";

interface WarehouseFormProps {
  form: CreateWarehouseInput;
  onChange: (form: CreateWarehouseInput) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function WarehouseForm({
  form,
  onChange,
  onSubmit,
  onCancel
}: WarehouseFormProps) {
  const isValid = form.name.trim().length > 0;

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Nombre *</label>
        <input 
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
          placeholder="Nombre de la bodega"
          className="input"
        />
      </div>
      <div>
        <label className="label">Código</label>
        <input 
          value={form.code}
          onChange={(e) => onChange({ ...form, code: e.target.value })}
          placeholder="Código identificador"
          className="input"
        />
      </div>
      <div>
        <label className="label">Dirección</label>
        <input 
          value={form.address}
          onChange={(e) => onChange({ ...form, address: e.target.value })}
          placeholder="Dirección de la bodega"
          className="input"
        />
      </div>
      <div className="flex items-center gap-2">
        <input 
          type="checkbox"
          id="isDefault"
          checked={form.isDefault}
          onChange={(e) => onChange({ ...form, isDefault: e.target.checked })}
          className="w-4 h-4"
        />
        <label htmlFor="isDefault" className="text-sm text-content-secondary">
          Bodega Principal (predeterminada)
        </label>
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
          Crear Bodega
        </button>
      </div>
    </div>
  );
}