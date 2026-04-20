/**
 * Modal de renovación de suscripción.
 */

import type { Subscription, Plan } from "../../types/admin.types";
import { Button } from "@/common/components/Button";
import { Select } from "@/common/components/Select";
import { Checkbox } from "@/common";

interface RenewModalProps {
  isOpen: boolean;
  subscription: Subscription | null;
  plans: Plan[];
  changePlan: boolean;
  selectedPlanId: string;
  isRenewing: boolean;
  onChangePlan: (change: boolean) => void;
  onSelectPlan: (planId: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

function getStatusBadge(status: Subscription["status"]): { label: string; className: string } {
  switch (status) {
    case "active":
      return { label: "Activa", className: "badge-success" };
    case "trial":
      return { label: "🧪 Prueba", className: "badge-info" };
    case "past_due":
      return { label: "Atrasada", className: "badge-warning" };
    default:
      return { label: "Cancelada", className: "badge-error" };
  }
}

export function RenewModal({ 
  isOpen, 
  subscription, 
  plans, 
  changePlan, 
  selectedPlanId, 
  isRenewing,
  onChangePlan,
  onSelectPlan,
  onConfirm,
  onCancel 
}: RenewModalProps) {
  if (!isOpen || !subscription) return null;

  const statusInfo = getStatusBadge(subscription.status);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="card w-full max-w-md mx-4">
        <div className="card-header">
          <h2 className="font-semibold text-content-primary">Renovar Suscripción</h2>
        </div>
        <div className="card-body space-y-4">
          <div className="bg-surface-50 p-3 rounded-lg">
            <p className="text-sm text-content-secondary">Tenant</p>
            <p className="font-medium text-content-primary">{subscription.tenantName}</p>
          </div>
          
          <div className="bg-surface-50 p-3 rounded-lg">
            <p className="text-sm text-content-secondary">Plan Actual</p>
            <p className="font-medium text-content-primary">{subscription.planName}</p>
          </div>
          
          <div className="bg-surface-50 p-3 rounded-lg">
            <p className="text-sm text-content-secondary">Estado</p>
            <span className={`badge ${statusInfo.className}`}>{statusInfo.label}</span>
          </div>

          <div className="border-t pt-4">
            <Checkbox
              label="¿Desea cambiar de plan?"
              checked={changePlan}
              onChange={(checked) => onChangePlan(checked)}
            />
          </div>

          {changePlan && (
            <div>
              <label className="label">Seleccionar Nuevo Plan</label>
              <Select
                value={selectedPlanId}
                onChange={(value) => onSelectPlan(String(value))}
                options={[
                  { value: "", label: "Seleccione un plan..." },
                  ...plans.map(p => ({ value: p.id, label: `${p.name} - ${p.price} USD/mes` }))
                ]}
                required
              />
            </div>
          )}

          {!changePlan && (
            <p className="text-sm text-content-secondary">
              Se renovará con el plan actual: <strong>{subscription.planName}</strong>
            </p>
          )}

          <div className="flex gap-3 pt-4 border-t">
            <Button 
              onClick={onConfirm}
              disabled={isRenewing || (changePlan && !selectedPlanId)}
              variant="primary"
              className="flex-1"
            >
              {isRenewing ? "Renovando..." : "Confirmar Renovación"}
            </Button>
            <Button 
              onClick={onCancel}
              disabled={isRenewing}
              variant="secondary"
              className="flex-1"
            >
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}