/**
 * Tabla de suscripciones.
 */

import type { Subscription } from "../../types/admin.types";

interface SubscriptionTableProps {
  subscriptions: Subscription[];
  isLoading: boolean;
  onRenew: (subscription: Subscription) => void;
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

function shouldShowRenewButton(subscription: Subscription): boolean {
  if (!subscription.endDate) return true;
  
  const now = new Date();
  const endDate = new Date(subscription.endDate);
  const diffTime = endDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays <= 3 || diffDays < 0 || (subscription.status !== 'active' && subscription.status !== 'trial');
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

export function SubscriptionTable({ subscriptions, isLoading, onRenew }: SubscriptionTableProps) {
  if (subscriptions.length === 0 && !isLoading) {
    return (
      <div className="p-8 text-center text-content-secondary">
        No hay suscripciones registradas
      </div>
    );
  }

  return (
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
            {subscriptions.map(sub => {
              const statusInfo = getStatusBadge(sub.status);
              return (
                <tr key={sub.id} className="hover:bg-surface-50 text-sm">
                  <td className="px-4 py-3 font-medium text-content-primary">{sub.tenantName}</td>
                  <td className="px-4 py-3 text-content-secondary">{sub.planName}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${statusInfo.className}`}>{statusInfo.label}</span>
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
                        onClick={() => onRenew(sub)}
                        className="btn btn-primary text-sm py-1 px-3"
                      >
                        Renovar
                      </button>
                    ) : (
                      <span className="text-content-secondary text-xs">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}