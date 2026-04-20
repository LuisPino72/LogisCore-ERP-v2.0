import type { CreateWarehouseInput } from "../../types/inventory.types";
import { Button } from "@/common/components/Button";
import { Checkbox } from "@/common/components/Checkbox";
import { FormField, Input } from "@/common";

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
      <FormField label="Nombre" htmlFor="warehouseName" required>
        <Input
          id="warehouseName"
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
          placeholder="Nombre de la bodega"
        />
      </FormField>
      <FormField label="Código" htmlFor="warehouseCode">
        <Input
          id="warehouseCode"
          value={form.code}
          onChange={(e) => onChange({ ...form, code: e.target.value })}
          placeholder="Código identificador"
        />
      </FormField>
      <FormField label="Dirección" htmlFor="warehouseAddress">
        <Input
          id="warehouseAddress"
          value={form.address}
          onChange={(e) => onChange({ ...form, address: e.target.value })}
          placeholder="Dirección de la bodega"
        />
      </FormField>
      <div className="flex items-center gap-2">
        <Checkbox 
          id="isDefault"
          checked={form.isDefault}
          onChange={(e) => onChange({ ...form, isDefault: e.target.checked })}
        />
        <label htmlFor="isDefault" className="text-sm text-content-secondary">
          Bodega Principal (predeterminada)
        </label>
      </div>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={onSubmit} disabled={!isValid}>
          Crear Bodega
        </Button>
      </div>
    </div>
  );
}