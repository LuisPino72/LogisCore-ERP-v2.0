/**
 * Panel de Seguridad.
 * Gestión de usuarios admins del sistema.
 * 
 * Funcionalidades:
 * - Listar todos los usuarios
 * - Ver información de cada usuario (email, rol, tenant)
 * - Activar/desactivar usuarios
 */

import { useEffect } from "react";
import type { SecurityUser } from "../types/admin.types";

interface SecurityPanelProps {
  users: SecurityUser[];
  isLoading: boolean;
  onRefresh: () => void;
  onToggleUser: (userId: string, isActive: boolean) => Promise<{ ok: boolean; error?: { message: string } }>;
}

/**
 * Componente que Renderiza la tabla de usuarios con opciones de seguridad.
 */
export function SecurityPanel({ users, isLoading, onRefresh, onToggleUser }: SecurityPanelProps) {
  useEffect(() => {
    onRefresh();
  }, [onRefresh]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-content-primary">Seguridad</h1>
          <p className="text-content-secondary">Gestión de usuarios y accesos</p>
        </div>
        <button onClick={onRefresh} disabled={isLoading} className="btn btn-secondary">
          {isLoading ? <span className="spinner" /> : "Actualizar"}
        </button>
      </div>

      <div className="card">
        <div className="card-body p-0">
          <table className="w-full">
            <thead className="bg-surface-100 text-left">
              <tr>
                <th className="px-4 py-3 text-sm font-medium text-content-secondary">Usuario</th>
                <th className="px-4 py-3 text-sm font-medium text-content-secondary">Email</th>
                <th className="px-4 py-3 text-sm font-medium text-content-secondary">Tenant</th>
                <th className="px-4 py-3 text-sm font-medium text-content-secondary">Rol</th>
                <th className="px-4 py-3 text-sm font-medium text-content-secondary">Último Login</th>
                <th className="px-4 py-3 text-sm font-medium text-content-secondary">Estado</th>
                <th className="px-4 py-3 text-sm font-medium text-content-secondary">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-surface-50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-content-primary">{user.fullName || "—"}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-content-secondary">{user.email}</td>
                  <td className="px-4 py-3 text-sm text-content-secondary">{user.tenantName || "—"}</td>
                  <td className="px-4 py-3">
                    <span className="badge badge-info">{user.role}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-content-secondary">
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : "Nunca"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${user.isActive ? "badge-success" : "badge-error"}`}>
                      {user.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onToggleUser(user.userId, !user.isActive)}
                      className={`text-sm ${user.isActive ? "text-state-error" : "text-state-success"}`}
                    >
                      {user.isActive ? "Desactivar" : "Activar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && !isLoading && (
            <div className="p-8 text-center text-content-secondary">
              No hay usuarios registrados
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
