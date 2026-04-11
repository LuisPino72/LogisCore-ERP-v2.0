/**
 * Formulario de tipo de negocio.
 */

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
      <select
        className="input"
        value={formData.businessTypeId}
        onChange={(e) => onChange("businessTypeId", e.target.value)}
      >
        <option value="">Seleccionar tipo de negocio...</option>
        {businessTypes.map(bt => (
          <option key={bt.id} value={bt.id}>{bt.name}</option>
        ))}
      </select>
    </div>
  );
}