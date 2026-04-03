/**
 * Dashboard del Admin Panel.
 * Pantalla de inicio que muestra estadísticas globales del sistema.
 * 
 * Muestra:
 * - Total de tenants registrados
 * - Tenants activos
 * - Total de usuarios
 * - Suscripciones activas
 */

import { useEffect } from "react";
import type { DashboardStats } from "../types/admin.types";

interface DashboardProps {
  stats: DashboardStats | null;
  isLoading: boolean;
  onRefresh: () => void;
}

/**
 * Componente que renderiza el dashboard con tarjetas de estadísticas.
 * Se carga automáticamente al montar el componente.
 */
export function Dashboard({ stats, isLoading, onRefresh }: DashboardProps) {
  useEffect(() => {
    onRefresh();
  }, [onRefresh]);

  const statCards = [
    { label: "Total Tenants", value: stats?.totalTenants ?? 0, color: "brand" },
    { label: "Tenants Activos", value: stats?.activeTenants ?? 0, color: "success" },
    { label: "Total Usuarios", value: stats?.totalUsers ?? 0, color: "info" },
    { label: "Suscripciones Activas", value: stats?.activeSubscriptions ?? 0, color: "warning" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-content-primary">Dashboard</h1>
          <p className="text-content-secondary">Resumen global del sistema</p>
        </div>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="btn btn-secondary"
        >
          {isLoading ? (
            <>
              <span className="spinner" />
              Cargando...
            </>
          ) : (
            "Actualizar"
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map(card => (
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

      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-content-primary">Información del Sistema</h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-content-secondary">Versión</p>
              <p className="font-medium text-content-primary">LogisCore ERP v2.0</p>
            </div>
            <div>
              <p className="text-content-secondary">Estado</p>
              <p className="font-medium text-state-success">Operativo</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
