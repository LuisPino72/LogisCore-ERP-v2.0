/**
 * Formulario de plan de suscripción para nuevo tenant.
 */

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
          <select
            className="input"
            value={formData.planId}
            onChange={(e) => onChange("planId", e.target.value)}
            required
          >
            <option value="">Seleccionar plan...</option>
            {(plans || []).map(p => (
              <option key={p.id} value={p.id}>{p.name} - ${p.price}/mes</option>
            ))}
          </select>
        </div>
        {formData.planId && (
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="enableTrial"
              checked={formData.trialDays > 0}
              onChange={(e) => onChange("trialDays", e.target.checked ? 7 : 0)}
              className="w-4 h-4"
            />
            <label htmlFor="enableTrial" className="text-sm">Habilitar período de prueba</label>
            {formData.trialDays > 0 && (
              <input
                type="number"
                className="input w-20"
                value={formData.trialDays}
                onChange={(e) => onChange("trialDays", Math.min(7, Math.max(1, parseInt(e.target.value) || 1)))}
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