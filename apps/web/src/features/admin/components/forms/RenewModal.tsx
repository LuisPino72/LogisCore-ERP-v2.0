/**
 * Modal de renovación de suscripción.
 */

import type { Subscription, Plan } from "../../types/admin.types";

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
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={changePlan}
                onChange={(e) => onChangePlan(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm text-content-primary">¿Desea cambiar de plan?</span>
            </label>
          </div>

          {changePlan && (
            <div>
              <label className="label">Seleccionar Nuevo Plan</label>
              <select
                className="input"
                value={selectedPlanId}
                onChange={(e) => onSelectPlan(e.target.value)}
                required
              >
                <option value="">Seleccione un plan...</option>
                {plans.map(p => (
                  <option key={p.id} value={p.id}>{p.name} - {p.price} USD/mes</option>
                ))}
              </select>
            </div>
          )}

          {!changePlan && (
            <p className="text-sm text-content-secondary">
              Se renovará con el plan actual: <strong>{subscription.planName}</strong>
            </p>
          )}

          <div className="flex gap-3 pt-4 border-t">
            <button 
              onClick={onConfirm}
              disabled={isRenewing || (changePlan && !selectedPlanId)}
              className="btn btn-primary flex-1"
            >
              {isRenewing ? "Renovando..." : "Confirmar Renovación"}
            </button>
            <button 
              onClick={onCancel}
              disabled={isRenewing}
              className="btn btn-secondary flex-1"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}