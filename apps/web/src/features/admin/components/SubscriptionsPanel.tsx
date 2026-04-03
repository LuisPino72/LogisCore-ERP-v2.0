/**
 * Panel de Suscripciones.
 * Gestión de planes de suscripción y suscripciones activas de tenants.
 * 
 * Muestra:
 * - Planes disponibles (Free, Basic, Pro)
 * - Suscripciones activas por tenant
 */

import { useEffect } from "react";
import type { Subscription, Plan } from "../types/admin.types";

interface SubscriptionsPanelProps {
  subscriptions: Subscription[];
  plans: Plan[];
  isLoading: boolean;
  onRefreshSubscriptions: () => void;
  onRefreshPlans: () => void;
}

export function SubscriptionsPanel({ subscriptions, plans, isLoading, onRefreshSubscriptions, onRefreshPlans }: SubscriptionsPanelProps) {
  useEffect(() => {
    onRefreshSubscriptions();
    onRefreshPlans();
  }, [onRefreshSubscriptions, onRefreshPlans]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-content-primary">Suscripciones</h1>
          <p className="text-content-secondary">Gestión de planes y suscripciones</p>
        </div>
        <button onClick={() => { onRefreshSubscriptions(); onRefreshPlans(); }} disabled={isLoading} className="btn btn-secondary">
          {isLoading ? <span className="spinner" /> : "Actualizar"}
        </button>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-content-primary mb-4">Planes</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map(plan => (
            <div key={plan.id} className="card">
              <div className="card-body">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-content-primary">{plan.name}</h3>
                  <span className={`badge ${plan.isActive ? "badge-success" : "badge-error"}`}>
                    {plan.isActive ? "Activo" : "Inactivo"}
                  </span>
                </div>
                <p className="text-2xl font-bold text-brand-600 mb-2">
                  ${plan.price}
                  <span className="text-sm font-normal text-content-secondary">/mes</span>
                </p>
                <p className="text-sm text-content-secondary mb-3">{plan.description}</p>
                <div className="text-xs text-content-tertiary space-y-1">
                  <p>Usuarios: {plan.maxUsers}</p>
                  <p>Productos: {plan.maxProducts === -1 ? "Ilimitado" : plan.maxProducts}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-content-primary mb-4">Suscripciones Activas</h2>
        <div className="card">
          <div className="card-body p-0">
            <table className="w-full">
              <thead className="bg-surface-100 text-left">
                <tr>
                  <th className="px-4 py-3 text-sm font-medium text-content-secondary">Tenant</th>
                  <th className="px-4 py-3 text-sm font-medium text-content-secondary">Plan</th>
                  <th className="px-4 py-3 text-sm font-medium text-content-secondary">Estado</th>
                  <th className="px-4 py-3 text-sm font-medium text-content-secondary">Inicio</th>
                  <th className="px-4 py-3 text-sm font-medium text-content-secondary">Fin</th>
                  <th className="px-4 py-3 text-sm font-medium text-content-secondary">Ciclo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {subscriptions.map(sub => (
                  <tr key={sub.id} className="hover:bg-surface-50">
                    <td className="px-4 py-3 font-medium text-content-primary">{sub.tenantName || "—"}</td>
                    <td className="px-4 py-3 text-sm text-content-secondary">{sub.planName || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${sub.status === "active" ? "badge-success" : "badge-warning"}`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-content-secondary">
                      {sub.startDate ? new Date(sub.startDate).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-content-secondary">
                      {sub.endDate ? new Date(sub.endDate).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-content-secondary">{sub.billingCycle || "—"}</td>
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
      </div>
    </div>
  );
}
