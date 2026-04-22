/**
 * Tabla de suscripciones.
 */

import type { Subscription } from "../../types/admin.types";
import { DataTable } from "@/common/components/DataTable";
import type { TableColumn } from "@/common/types/common.types";
import { Badge } from "@/common/components/Badge";

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

function getStatusBadge(status: Subscription["status"]): { label: string; variant: BadgeVariant } {
  switch (status) {
    case "active":
      return { label: "Activa", variant: "success" };
    case "trial":
      return { label: "🧪 Prueba", variant: "info" };
    case "past_due":
      return { label: "Atrasada", variant: "warning" };
    default:
      return { label: "Cancelada", variant: "error" };
  }
}

export function SubscriptionTable({ subscriptions, isLoading, onRenew }: SubscriptionTableProps) {
  const columns: TableColumn<Subscription>[] = [
    { key: "tenantName", header: "Tenant", width: "1.5fr" },
    { key: "planName", header: "Plan", width: "1fr" },
    { 
      key: "status", 
      header: "Estado", 
      width: "0.75fr",
      render: (value) => {
        const info = getStatusBadge(String(value));
        return <Badge variant={info.variant}>{info.label}</Badge>;
      }
    },
    { key: "billingCycle", header: "Ciclo", width: "0.75fr", render: (v) => <span className="uppercase">{String(v)}</span> },
    { 
      key: "endDate", 
      header: "Próximo Pago", 
      width: "1.2fr",
      render: (value) => {
        const date = String(value);
        const isExpired = date && new Date(date) < new Date();
        return (
          <div className="flex flex-col">
            <span className={isExpired ? "text-red-500" : ""}>
              {date ? new Date(date).toLocaleDateString() : "Indefinido"}
            </span>
            {date && (
              <span className="text-xs text-content-secondary">
                ({getDaysRemaining(date)})
              </span>
            )}
          </div>
        );
      }
    },
    { 
      key: "actions", 
      header: "Acciones", 
      width: "0.75fr",
      render: (_, row) => (
        shouldShowRenewButton(row) ? (
          <Button onClick={() => onRenew(row)} size="sm">Renovar</Button>
        ) : (
          <span className="text-content-secondary text-xs">-</span>
        )
      )
    }
  ];

  if (subscriptions.length === 0 && !isLoading) {
    return (
      <div className="p-8 text-center text-content-secondary">
        No hay suscripciones registradas
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="card-body p-0">
        <DataTable
          columns={columns}
          data={subscriptions}
          loading={isLoading}
          emptyMessage="No hay suscripciones registradas"
        />
      </div>
    </div>
  );
}