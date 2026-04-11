/**
 * Formulario de tipo de negocio.
 */

import { FormField, Select } from "@/common";

interface BusinessTypeSelectProps {
  formData: { businessTypeId: string };
  businessTypes: { id: string; name: string }[];
  onChange: (field: string, value: string | number | boolean) => void;
}

export function BusinessTypeSelect({ formData, businessTypes, onChange }: BusinessTypeSelectProps) {
  if (!businessTypes || businessTypes.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-medium text-content-primary mb-3 border-b pb-1">Tipo de Negocio</h3>
      <FormField label="" htmlFor="businessType">
        <Select
          value={formData.businessTypeId}
          onChange={(value) => onChange("businessTypeId", String(value))}
          options={businessTypes.map(bt => ({ value: bt.id, label: bt.name }))}
          placeholder="Seleccionar tipo de negocio..."
        />
      </FormField>
    </div>
  );
}