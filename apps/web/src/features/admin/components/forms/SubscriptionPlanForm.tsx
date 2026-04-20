/**
 * Formulario de plan de suscripción para nuevo tenant.
 */

import { Select } from "@/common/components/Select";
import { Input } from "@/common/components/FormField";
import { Checkbox } from "@/common";

interface SubscriptionPlanFormProps {
  formData: { planId: string; trialDays: number };
  plans: { id: string; name: string; price: number }[];
  onChange: (field: string, value: string | number | boolean) => void;
}

export function SubscriptionPlanForm({ formData, plans, onChange }: SubscriptionPlanFormProps) {
  return (
    <div>
      <h3 className="text-sm font-medium text-content-primary mb-3 border-b pb-1">Plan de Suscripción</h3>
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="label">Elegir un Plan</label>
          <Select
            value={formData.planId}
            onChange={(value) => onChange("planId", value)}
            options={[
              { value: "", label: "Seleccionar plan..." },
              ...(plans || []).map(p => ({ value: p.id, label: `${p.name} - $${p.price}/mes` }))
            ]}
            required
          />
        </div>
        {formData.planId && (
          <div className="flex items-center gap-3">
            <Checkbox
              label="Habilitar período de prueba"
              checked={formData.trialDays > 0}
              onChange={(checked) => onChange("trialDays", checked ? 7 : 0)}
            />
            {formData.trialDays > 0 && (
              <Input
                type="number"
                className="w-20"
                value={formData.trialDays}
                onChange={(value) => onChange("trialDays", Math.min(7, Math.max(1, parseInt(value) || 1)))}
                min={1}
                max={7}
              />
            )}
          </div>
        )}
        {formData.trialDays > 0 && (
          <p className="text-xs text-content-secondary">El tenant tendrá acceso gratuito por {formData.trialDays} días</p>
        )}
      </div>
    </div>
  );
}