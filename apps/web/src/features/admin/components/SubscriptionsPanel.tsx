/**
 * Panel de Suscripciones.
 * Gestión de planes y suscripciones de tenants.
 */

import { useEffect, useState } from "react";
import type { Subscription, Plan } from "../types/admin.types";

import { SubscriptionTable } from "./forms/SubscriptionTable";
import { RenewModal } from "./forms/RenewModal";

interface SubscriptionsPanelProps {
  subscriptions: Subscription[];
  plans: Plan[];
  isLoading: boolean;
  onRefreshSubscriptions: () => void;
  onRefreshPlans: () => void;
  onRefreshTenants: () => void;
  onRenewSubscription: (subscriptionId: string, newPlanId?: string) => Promise<{ ok: boolean; error?: { message: string } }>;
}

export function SubscriptionsPanel({ 
  subscriptions, 
  plans, 
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

      <SubscriptionTable
        subscriptions={subscriptions}
        isLoading={isLoading}
        onRenew={openRenewModal}
      />

      <RenewModal
        isOpen={renewModal.open}
        subscription={renewModal.subscription}
        plans={plans}
        changePlan={renewModal.changePlan}
        selectedPlanId={renewModal.selectedPlanId}
        isRenewing={isRenewing}
        onChangePlan={(changePlan) => setRenewModal(prev => ({ ...prev, changePlan, selectedPlanId: changePlan ? prev.selectedPlanId : "" }))}
        onSelectPlan={(selectedPlanId) => setRenewModal(prev => ({ ...prev, selectedPlanId }))}
        onConfirm={handleRenew}
        onCancel={closeRenewModal}
      />
    </div>
  );
}