/**
 * Formulario de almacén para nuevo tenant.
 */

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
        <input
          type="checkbox"
          id="hasWarehouse"
          checked={formData.hasWarehouse}
          onChange={(e) => onChange("hasWarehouse", e.target.checked)}
          className="w-4 h-4"
        />
        <label htmlFor="hasWarehouse" className="text-sm">¿Este tenant tiene almacén?</label>
      </div>
      {formData.hasWarehouse && (
        <div className="grid grid-cols-2 gap-4 p-3 bg-surface-50 rounded-lg border">
          <div>
            <label className="label">Nombre del Almacén</label>
            <input
              type="text"
              className={`input ${errors.warehouseName ? "border-red-500" : ""}`}
              value={formData.warehouse.name}
              onChange={(e) => onChangeWarehouse("name", e.target.value)}
              placeholder="Almacén Principal"
              maxLength={VALIDATION_RULES.MAX_TEXT_LENGTH}
              required
            />
            {errors.warehouseName && <p className="text-xs text-red-500 mt-1">{errors.warehouseName}</p>}
          </div>
          <div>
            <label className="label">Dirección</label>
            <input
              type="text"
              className="input"
              value={formData.warehouse.address || ""}
              onChange={(e) => onChangeWarehouse("address", e.target.value)}
              placeholder="Dirección del almacén"
            />
          </div>
          <div className="col-span-2 flex items-center gap-3">
            <input
              type="checkbox"
              id="isDefault"
              checked={formData.warehouse.isDefault}
              onChange={(e) => onChangeWarehouse("isDefault", e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="isDefault" className="text-sm">¿Es el almacén principal?</label>
          </div>
        </div>
      )}
    </div>
  );
}