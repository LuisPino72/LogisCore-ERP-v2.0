/**
 * Panel de Suscripciones.
 * Gestión de planes y suscripciones de tenants.
 */

import { useEffect, useState } from "react";
import type { Subscription, Plan, Tenant, CreateSubscriptionInput, UpdateSubscriptionInput } from "../types/admin.types";

interface SubscriptionsPanelProps {
  subscriptions: Subscription[];
  plans: Plan[];
  tenants: Tenant[];
  isLoading: boolean;
  onRefreshSubscriptions: () => void;
  onRefreshPlans: () => void;
  onRefreshTenants: () => void;
  onCreate: (input: CreateSubscriptionInput) => Promise<{ ok: boolean; error?: { message: string } }>;
  onUpdate: (id: string, input: UpdateSubscriptionInput) => Promise<{ ok: boolean; error?: { message: string } }>;
}

export function SubscriptionsPanel({ 
  subscriptions, 
  plans, 
  tenants,
  isLoading, 
  onRefreshSubscriptions, 
  onRefreshPlans,
  onRefreshTenants,
  onCreate,
  onUpdate
}: SubscriptionsPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);
  const [formData, setFormData] = useState<CreateSubscriptionInput>({
    tenantId: "",
    planId: "",
    status: "active",
    billingCycle: "monthly"
  });

  useEffect(() => {
    onRefreshSubscriptions();
    onRefreshPlans();
    onRefreshTenants();
  }, [onRefreshSubscriptions, onRefreshPlans, onRefreshTenants]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSub) {
      const result = await onUpdate(editingSub.id, {
        planId: formData.planId,
        status: formData.status,
        billingCycle: formData.billingCycle
      });
      if (result.ok) {
        setShowForm(false);
        setEditingSub(null);
      }
    } else {
      const result = await onCreate(formData);
      if (result.ok) {
        setShowForm(false);
        setFormData({ tenantId: "", planId: "", status: "active", billingCycle: "monthly" });
      }
    }
  };

  const startEdit = (sub: Subscription) => {
    setEditingSub(sub);
    setFormData({
      tenantId: sub.tenantId,
      planId: sub.planId || "",
      status: sub.status,
      billingCycle: (sub.billingCycle as any) || "monthly"
    });
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-content-primary">Suscripciones</h1>
          <p className="text-content-secondary">Gestión de planes activos y facturación</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => {
              setEditingSub(null);
              setFormData({ tenantId: "", planId: "", status: "active", billingCycle: "monthly" });
              setShowForm(prev => !prev);
            }} 
            className="btn btn-primary"
          >
            {showForm ? "Cancelar" : "+ Nueva Suscripción"}
          </button>
          <button onClick={onRefreshSubscriptions} disabled={isLoading} className="btn btn-secondary">
            {isLoading ? <span className="spinner" /> : "Actualizar"}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-content-primary">
              {editingSub ? `Editar Suscripción: ${editingSub.tenantName}` : "Nueva Suscripción"}
            </h2>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Tenant (Empresa)</label>
                <select
                  className="input"
                  value={formData.tenantId}
                  onChange={e => setFormData({ ...formData, tenantId: e.target.value })}
                  disabled={!!editingSub}
                  required
                >
                  <option value="">Seleccione un tenant...</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Plan</label>
                <select
                  className="input"
                  value={formData.planId}
                  onChange={e => setFormData({ ...formData, planId: e.target.value })}
                  required
                >
                  <option value="">Seleccione un plan...</option>
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>{p.name} - {p.price} USD</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Estado</label>
                <select
                  className="input"
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                  required
                >
                  <option value="active">Activa</option>
                  <option value="trialing">Prueba</option>
                  <option value="past_due">Atrasada</option>
                  <option value="canceled">Cancelada</option>
                </select>
              </div>
              <div>
                <label className="label">Ciclo de Facturación</label>
                <select
                  className="input"
                  value={formData.billingCycle}
                  onChange={e => setFormData({ ...formData, billingCycle: e.target.value })}
                  required
                >
                  <option value="monthly">Mensual</option>
                  <option value="yearly">Anual</option>
                </select>
              </div>
              <div className="md:col-span-2 flex gap-3 pt-4 border-t border-border mt-4">
                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                  {editingSub ? "Guardar Cambios" : "Crear Suscripción"}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowForm(false)} 
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                    {sub.endDate ? new Date(sub.endDate).toLocaleDateString() : "Indefinido"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => startEdit(sub)}
                      className="text-brand-600 hover:text-brand-700"
                    >
                      Gestionar
                    </button>
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
    </div>
  );
}
