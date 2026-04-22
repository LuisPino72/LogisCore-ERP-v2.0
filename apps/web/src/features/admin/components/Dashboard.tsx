/**
 * Command Center del Admin Panel.
 * Dashboard unificado que muestra estadísticas de negocio + métricas técnicas del sistema.
 */

import { useEffect } from "react";
import type { DashboardStats, SystemMetrics } from "../types/admin.types";
import { Button } from "@/common/components/Button";

interface CommandCenterProps {
  stats: DashboardStats | null;
  metrics: SystemMetrics | null;
  isLoading: boolean;
  onRefresh: () => void;
}

const formatDate = (isoString: string) => {
  if (!isoString) return "N/A";
  const date = new Date(isoString);
  return date.toLocaleDateString("es-VE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

export function CommandCenter({ stats, metrics, isLoading, onRefresh }: CommandCenterProps) {
  useEffect(() => {
    onRefresh();
  }, [onRefresh]);

  const businessCards = [
    { label: "Total Tenants", value: metrics?.totalTenants ?? stats?.totalTenants ?? 0, color: "brand" },
    { label: "Tenants Activos", value: stats?.activeTenants ?? 0, color: "success" },
    { label: "Total Usuarios", value: metrics?.totalUsers ?? stats?.totalUsers ?? 0, color: "info" },
    { label: "Suscripciones Activas", value: metrics?.activeSubscriptions ?? stats?.activeSubscriptions ?? 0, color: "warning" },
  ];

  const systemCards = [
    {
      label: "Sesiones Activas",
      value: metrics?.activeSessionsToday ?? 0,
      icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a4 4 0 11-8 0 4 4 0 018 0zM17 20a2 2 0 100-4 2 2 0 000 4z",
      color: "text-brand-500",
      bgColor: "bg-brand-50",
      borderColor: "border-brand-200"
    },
    {
      label: "Transacciones Hoy",
      value: metrics?.transactionsToday ?? 0,
      icon: "M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z",
      color: "text-state-success",
      bgColor: "bg-green-50",
      borderColor: "border-green-200"
    },
    {
      label: "Errores Esta Semana",
      value: metrics?.errorsThisWeek ?? 0,
      icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
      color: (metrics?.errorsThisWeek ?? 0) > 0 ? "text-state-error" : "text-state-success",
      bgColor: (metrics?.errorsThisWeek ?? 0) > 0 ? "bg-red-50" : "bg-green-50",
      borderColor: (metrics?.errorsThisWeek ?? 0) > 0 ? "border-red-200" : "border-green-200"
    },
    {
      label: "Uptime",
      value: `${metrics?.uptime ?? 99.9}%`,
      icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
      color: "text-state-info",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200"
    }
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-content-primary">Command Center</h1>
          <p className="text-content-secondary">Resumen global del sistema</p>
        </div>
        <Button onClick={onRefresh} disabled={isLoading} variant="secondary">
          {isLoading ? (
            <>
              <span className="spinner" />
              Cargando...
            </>
          ) : (
            "Actualizar"
          )}
        </Button>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-content-primary mb-4">Estadísticas de Negocio</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {businessCards.map(card => (
            <div key={card.label} className="card">
              <div className="card-body">
                <p className="text-sm text-content-secondary mb-1">{card.label}</p>
                <p className={`text-3xl font-bold text-${card.color}-600`}>
                  {card.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-content-primary mb-4">Métricas del Sistema</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {systemCards.map((card, index) => (
            <div
              key={card.label}
              className={`stat-card border ${card.borderColor} relative overflow-hidden group`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={`absolute top-0 right-0 w-24 h-24 ${card.bgColor} rounded-full -translate-y-8 translate-x-8 opacity-50`} />
              <div className="relative z-10">
                <div className={`w-10 h-10 rounded-xl ${card.bgColor} flex items-center justify-center mb-3`}>
                  <svg className={`w-5 h-5 ${card.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={card.icon} />
                  </svg>
                </div>
                <p className="stat-value text-content-primary">{card.value}</p>
                <p className="stat-label text-content-tertiary">{card.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="font-semibold text-content-primary">Estado del Sistema</h2>
          <span className="badge badge-success">Operativo</span>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-state-success animate-pulse" />
              <div>
                <p className="text-sm text-content-secondary">Base de Datos</p>
                <p className="font-medium text-content-primary">Conectada</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-state-success animate-pulse" />
              <div>
                <p className="text-sm text-content-secondary">Último Deploy</p>
                <p className="font-medium text-content-primary">
                  {metrics?.lastDeployment ? formatDate(metrics.lastDeployment) : "Cargando..."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-state-success animate-pulse" />
              <div>
                <p className="text-sm text-content-secondary">Auth Service</p>
                <p className="font-medium text-content-primary">Activo</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-state-success animate-pulse" />
              <div>
                <p className="text-sm text-content-secondary">Edge Functions</p>
                <p className="font-medium text-content-primary">Disponibles</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center text-xs text-content-tertiary pt-4">
        <p>LogisCore ERP v2.0 • Command Center • Solo visible para administración</p>
      </div>
    </div>
  );
}

export const Dashboard = CommandCenter;