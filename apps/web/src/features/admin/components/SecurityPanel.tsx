import { useEffect, useState } from "react";
import type { SecurityUser } from "../types/admin.types";

interface SecurityPanelProps {
  users: SecurityUser[];
  isLoading: boolean;
  onRefresh: () => void;
  onToggleUser: (userId: string, isActive: boolean) => Promise<{ ok: boolean; error?: { message: string } }>;
}

export function SecurityPanel({ 
  users, 
  isLoading, 
  onRefresh, 
  onToggleUser
}: SecurityPanelProps) {
  const [activeTab, setActiveTab] = useState<"users" | "audit">("users");

  useEffect(() => {
    onRefresh();
  }, [onRefresh]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-content-primary">Seguridad y Accesos</h1>
          <p className="text-content-secondary">Visualización de usuarios y registros de auditoría</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onRefresh} disabled={isLoading} className="btn btn-secondary">
            {isLoading ? <span className="spinner" /> : "Actualizar"}
          </button>
        </div>
      </div>

      <div className="flex border-b border-border mb-4">
        <button
          className={`py-2 px-4 font-medium text-sm transition-colors border-b-2 ${
            activeTab === "users"
              ? "border-brand-600 text-brand-600"
              : "border-transparent text-content-secondary hover:text-content-primary"
          }`}
          onClick={() => setActiveTab("users")}
        >
          Directorio Global de Usuarios
        </button>
        <button
          className={`py-2 px-4 font-medium text-sm transition-colors border-b-2 ${
            activeTab === "audit"
              ? "border-brand-600 text-brand-600"
              : "border-transparent text-content-secondary hover:text-content-primary"
          }`}
          onClick={() => setActiveTab("audit")}
        >
          Registros de Auditoría
        </button>
      </div>

      {activeTab === "users" && (
        <div className="card overflow-hidden">
          <div className="card-header border-b border-border bg-surface-50 flex items-center justify-between">
            <h2 className="font-semibold text-content-primary">Lista de Usuarios del Sistema</h2>
            <p className="text-xs text-content-secondary bg-surface-200 px-2 py-1 rounded">
              Solo Lectura - La gestión de empleados se realiza dentro de cada Tenant.
            </p>
          </div>
          <div className="card-body p-0 overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-100 text-left border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-sm font-medium text-content-secondary">Usuario</th>
                  <th className="px-4 py-3 text-sm font-medium text-content-secondary">Email</th>
                  <th className="px-4 py-3 text-sm font-medium text-content-secondary">Tenant</th>
                  <th className="px-4 py-3 text-sm font-medium text-content-secondary">Rol</th>
                  <th className="px-4 py-3 text-sm font-medium text-content-secondary">Estado</th>
                  <th className="px-4 py-3 text-sm font-medium text-content-secondary">Acciones Clave</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-surface-50 text-sm">
                    <td className="px-4 py-3">
                      <span className="font-medium text-content-primary">{user.fullName || "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-content-secondary">{user.email}</td>
                    <td className="px-4 py-3 text-content-secondary">{user.tenantName || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${user.role === 'admin' ? 'badge-warning' : 'badge-info'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${user.isActive ? "badge-success" : "badge-error"}`}>
                        {user.isActive ? "Activo" : "Bloqueado"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {user.role !== 'admin' && (
                        <button
                          onClick={() => {
                            if(window.confirm(`¿Seguro que deseas ${user.isActive ? 'bloquear' : 'desbloquear'} a este usuario?`)) {
                              onToggleUser(user.userId, !user.isActive)
                            }
                          }}
                          className={user.isActive ? "text-state-error font-medium hover:underline" : "text-state-success font-medium hover:underline"}
                        >
                          {user.isActive ? "Bloquear Acceso" : "Permitir Acceso"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && !isLoading && (
              <div className="p-8 text-center text-content-secondary">
                No hay usuarios registrados en el sistema.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "audit" && (
        <div className="card overflow-hidden">
          <div className="card-header border-b border-border bg-surface-50">
            <h2 className="font-semibold text-content-primary">Historial de Accesos (Próximamente)</h2>
          </div>
          <div className="card-body p-12 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-surface-200 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-content-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-content-primary mb-2">Módulo de Auditoría en Construcción</h3>
            <p className="text-content-secondary max-w-md mx-auto">
              Esta sección se conectará directamente con los logs internos de Supabase para mostrar un registro detallado de: 
              Inicios de sesión, intentos fallidos, cambios de contraseñas y accesos desde nuevas IPs.
            </p>
            <button className="btn btn-primary mt-6 opacity-50 cursor-not-allowed">
              Conectar Logs (Muy Pronto)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
