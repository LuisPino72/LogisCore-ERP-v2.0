/**
 * Formulario de almacén para nuevo tenant.
 */

import { Input, Checkbox } from "@/common";
import type { WarehouseInput } from "../TenantForm";
import { VALIDATION_RULES } from "@/common";

interface WarehouseFormProps {
  formData: { hasWarehouse: boolean; warehouse: WarehouseInput };
  errors: Record<string, string>;
  onChangeWarehouse: (field: string, value: string | boolean) => void;
  onChange: (field: string, value: string | number | boolean) => void;
}

export function WarehouseForm({ formData, errors, onChangeWarehouse, onChange }: WarehouseFormProps) {
  return (
    <div>
      <h3 className="text-sm font-medium text-content-primary mb-3 border-b pb-1">Almacén</h3>
      <div className="flex items-center gap-3 mb-3">
        <Checkbox
          label="¿Este tenant tiene almacén?"
          checked={formData.hasWarehouse}
          onChange={(checked) => onChange("hasWarehouse", checked)}
        />
      </div>
      {formData.hasWarehouse && (
        <div className="grid grid-cols-2 gap-4 p-3 bg-surface-50 rounded-lg border">
          <div>
            <label className="label">Nombre del Almacén</label>
            <Input
              type="text"
              className={errors.warehouseName ? "border-state-error" : ""}
              value={formData.warehouse.name}
              onChange={(e) => onChangeWarehouse("name", e.target.value)}
              placeholder="Almacén Principal"
              maxLength={VALIDATION_RULES.MAX_TEXT_LENGTH}
              required
            />
            {errors.warehouseName && <p className="text-xs text-state-error mt-1">{errors.warehouseName}</p>}
          </div>
          <div>
            <label className="label">Dirección</label>
            <Input
              type="text"
              value={formData.warehouse.address || ""}
              onChange={(e) => onChangeWarehouse("address", e.target.value)}
              placeholder="Dirección del almacén"
            />
          </div>
          <div className="col-span-2 flex items-center gap-3">
            <Checkbox
              label="¿Es el almacén principal?"
              checked={formData.warehouse.isDefault}
              onChange={(checked) => onChangeWarehouse("isDefault", checked)}
            />
          </div>
        </div>
      )}
    </div>
  );
}