/**
 * Panel de Suscripciones.
 * Gestión de planes y suscripciones de tenants.
 * Solo muestra lista (las suscripciones se crean automáticamente al crear tenant).
 */

import { useEffect, useState } from "react";
import type { Subscription, Plan, Tenant } from "../types/admin.types";

interface SubscriptionsPanelProps {
  subscriptions: Subscription[];
  plans: Plan[];
  tenants: Tenant[];
  isLoading: boolean;
  onRefreshSubscriptions: () => void;
  onRefreshPlans: () => void;
  onRefreshTenants: () => void;
  onRenewSubscription: (subscriptionId: string, newPlanId?: string) => Promise<{ ok: boolean; error?: { message: string } }>;
}

function shouldShowRenewButton(subscription: Subscription): boolean {
  if (!subscription.endDate) return true;
  
  const now = new Date();
  const endDate = new Date(subscription.endDate);
  const diffTime = endDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Mostrar botón si:
  // - Quedan <= 3 días para que venza, O
  // - Ya está vencida (end_date < now), O
  // - Estado != 'active'
  return diffDays <= 3 || diffDays < 0 || subscription.status !== 'active';
}

function getDaysRemaining(endDate: string | undefined): string {
  if (!endDate) return "Indefinido";
  
  const now = new Date();
  const end = new Date(endDate);
  const diffTime = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return "Vencida";
  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "1 día";
  return `${diffDays} días`;
}

export function SubscriptionsPanel({ 
  subscriptions, 
  plans, 
  tenants,
  isLoading, 
  onRefreshSubscriptions, 
  onRefreshPlans,
  onRefreshTenants,
  onRenewSubscription
}: SubscriptionsPanelProps) {
  const [renewModal, setRenewModal] = useState<{
    open: boolean;
    subscription: Subscription | null;
    changePlan: boolean;
    selectedPlanId: string;
  }>({
    open: false,
    subscription: null,
    changePlan: false,
    selectedPlanId: ""
  });
  const [isRenewing, setIsRenewing] = useState(false);

  useEffect(() => {
    onRefreshSubscriptions();
    onRefreshPlans();
    onRefreshTenants();
  }, [onRefreshSubscriptions, onRefreshPlans, onRefreshTenants]);

  const openRenewModal = (sub: Subscription) => {
    setRenewModal({
      open: true,
      subscription: sub,
      changePlan: false,
      selectedPlanId: sub.planId || ""
    });
  };

  const closeRenewModal = () => {
    setRenewModal({
      open: false,
      subscription: null,
      changePlan: false,
      selectedPlanId: ""
    });
  };

  const handleRenew = async () => {
    if (!renewModal.subscription) return;
    
    setIsRenewing(true);
    const newPlanId = renewModal.changePlan ? renewModal.selectedPlanId : undefined;
    const result = await onRenewSubscription(renewModal.subscription.id, newPlanId);
    setIsRenewing(false);
    
    if (result.ok) {
      closeRenewModal();
      onRefreshSubscriptions();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-content-primary">Suscripciones</h1>
          <p className="text-content-secondary">Gestión de planes activos y facturación</p>
        </div>
        <button onClick={onRefreshSubscriptions} disabled={isLoading} className="btn btn-secondary">
          {isLoading ? <span className="spinner" /> : "Actualizar"}
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="card-body p-0 overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-100 text-left">
              <tr>
                <th className="px-4 py-3 text-sm font-medium text-content-secondary">Tenant</th>
                <th className="px-4 py-3 text-sm font-medium text-content-secondary">Plan</th>
                <th className="px-4 py-3 text-sm font-medium text-content-secondary">Estado</th>
                <th className="px-4 py-3 text-sm font-medium text-content-secondary">Ciclo</th>
                <th className="px-4 py-3 text-sm font-medium text-content-secondary">Próximo Pago</th>
                <th className="px-4 py-3 text-sm font-medium text-content-secondary">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {subscriptions.map(sub => (
                <tr key={sub.id} className="hover:bg-surface-50 text-sm">
                  <td className="px-4 py-3 font-medium text-content-primary">{sub.tenantName}</td>
                  <td className="px-4 py-3 text-content-secondary">{sub.planName}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${
                      sub.status === "active" ? "badge-success" : 
                      sub.status === "trialing" ? "badge-info" : 
                      "badge-error"
                    }`}>
                      {sub.status === "active" ? "Activa" : 
                       sub.status === "trialing" ? "Prueba" : 
                       sub.status === "past_due" ? "Atrasada" : "Cancelada"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-content-secondary uppercase">{sub.billingCycle}</td>
                  <td className="px-4 py-3 text-content-secondary">
                    <span className={sub.endDate && new Date(sub.endDate) < new Date() ? "text-red-500" : ""}>
                      {sub.endDate ? new Date(sub.endDate).toLocaleDateString() : "Indefinido"}
                    </span>
                    {sub.endDate && (
                      <span className="ml-2 text-xs text-content-secondary">
                        ({getDaysRemaining(sub.endDate)})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {shouldShowRenewButton(sub) ? (
                      <button
                        onClick={() => openRenewModal(sub)}
                        className="btn btn-primary text-sm py-1 px-3"
                      >
                        Renovar
                      </button>
                    ) : (
                      <span className="text-content-secondary text-xs">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {subscriptions.length === 0 && !isLoading && (
            <div className="p-8 text-center text-content-secondary">
              No hay suscripciones registradas
            </div>
          )}
        </div>
      </div>

      {/* Modal de Renovación */}
      {renewModal.open && renewModal.subscription && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card w-full max-w-md mx-4">
            <div className="card-header">
              <h2 className="font-semibold text-content-primary">Renovar Suscripción</h2>
            </div>
            <div className="card-body space-y-4">
              <div className="bg-surface-50 p-3 rounded-lg">
                <p className="text-sm text-content-secondary">Tenant</p>
                <p className="font-medium text-content-primary">{renewModal.subscription.tenantName}</p>
              </div>
              
              <div className="bg-surface-50 p-3 rounded-lg">
                <p className="text-sm text-content-secondary">Plan Actual</p>
                <p className="font-medium text-content-primary">{renewModal.subscription.planName}</p>
              </div>
              
              <div className="bg-surface-50 p-3 rounded-lg">
                <p className="text-sm text-content-secondary">Estado</p>
                <span className={`badge ${
                  renewModal.subscription.status === "active" ? "badge-success" : 
                  renewModal.subscription.status === "trialing" ? "badge-info" : 
                  "badge-error"
                }`}>
                  {renewModal.subscription.status === "active" ? "Activa" : 
                   renewModal.subscription.status === "trialing" ? "Prueba" : 
                   renewModal.subscription.status === "past_due" ? "Atrasada" : "Cancelada"}
                </span>
              </div>

              <div className="border-t pt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={renewModal.changePlan}
                    onChange={(e) => setRenewModal(prev => ({
                      ...prev,
                      changePlan: e.target.checked,
                      selectedPlanId: e.target.checked ? prev.selectedPlanId : ""
                    }))}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-content-primary">¿Desea cambiar de plan?</span>
                </label>
              </div>

              {renewModal.changePlan && (
                <div>
                  <label className="label">Seleccionar Nuevo Plan</label>
                  <select
                    className="input"
                    value={renewModal.selectedPlanId}
                    onChange={(e) => setRenewModal(prev => ({ ...prev, selectedPlanId: e.target.value }))}
                    required
                  >
                    <option value="">Seleccione un plan...</option>
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>{p.name} - {p.price} USD/mes</option>
                    ))}
                  </select>
                </div>
              )}

              {!renewModal.changePlan && (
                <p className="text-sm text-content-secondary">
                  Se renovará con el plan actual: <strong>{renewModal.subscription.planName}</strong>
                </p>
              )}

              <div className="flex gap-3 pt-4 border-t">
                <button 
                  onClick={handleRenew}
                  disabled={isRenewing || (renewModal.changePlan && !renewModal.selectedPlanId)}
                  className="btn btn-primary flex-1"
                >
                  {isRenewing ? "Renovando..." : "Confirmar Renovación"}
                </button>
                <button 
                  onClick={closeRenewModal}
                  disabled={isRenewing}
                  className="btn btn-secondary flex-1"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
