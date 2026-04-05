import { useState, useEffect } from "react";
import type { SecurityUser, AuditLogEntry } from "../types/admin.types";

interface SecurityPanelProps {
  users: SecurityUser[];
  isLoading: boolean;
  onRefresh: () => void;
  onToggleUser: (userId: string, isActive: boolean) => Promise<{ ok: boolean; error?: { message: string } }>;
  auditLogs?: AuditLogEntry[];
  auditLogsTotal?: number;
  onLoadAuditLogs?: (limit?: number, offset?: number) => void;
}

export function SecurityPanel({ 
  users, 
  isLoading, 
  onRefresh, 
  onToggleUser,
  auditLogs = [],
  auditLogsTotal = 0,
  onLoadAuditLogs
}: SecurityPanelProps) {
  const [activeTab, setActiveTab] = useState<"users" | "audit">("users");
  const [auditPage, setAuditPage] = useState(0);

  useEffect(() => {
    if (activeTab === "audit" && onLoadAuditLogs) {
      onLoadAuditLogs(20, auditPage * 20);
    }
  }, [activeTab, auditPage, onLoadAuditLogs]);

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString("es-VE", {
      dateStyle: "short",
      timeStyle: "short"
    });
  };

  const formatAction = (action: string) => {
    const actionMap: Record<string, string> = {
      "LOGIN": "Inicio de sesión",
      "LOGIN_FAILED": "Intento de inicio fallido",
      "LOGOUT": "Cierre de sesión",
      "PASSWORD_RESET": "Cambio de contraseña",
      "USER_CREATED": "Usuario creado",
      "USER_UPDATED": "Usuario actualizado",
      "USER_DELETED": "Usuario eliminado",
      "TENANT_CREATED": "Tenant creado",
      "TENANT_UPDATED": "Tenant actualizado",
      "TENANT_DELETED": "Tenant eliminado"
    };
    return actionMap[action] || action;
  };

  const getActionBadgeClass = (action: string) => {
    if (action.includes("FAILED")) return "badge-error";
    if (action.includes("DELETE")) return "badge-warning";
    if (action.includes("CREATE")) return "badge-success";
    if (action.includes("LOGIN") || action.includes("LOGOUT")) return "badge-info";
    return "badge-default";
  };

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
            <h2 className="font-semibold text-content-primary">Historial de Accesos</h2>
          </div>
          <div className="card-body p-0 overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-100 text-left border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-sm font-medium text-content-secondary">Fecha/Hora</th>
                  <th className="px-4 py-3 text-sm font-medium text-content-secondary">Acción</th>
                  <th className="px-4 py-3 text-sm font-medium text-content-secondary">Usuario</th>

                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-surface-50 text-sm">
                    <td className="px-4 py-3 text-content-secondary whitespace-nowrap">
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${getActionBadgeClass(log.action)}`}>
                        {formatAction(log.action)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-content-primary">
                      {log.email || log.userId || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {auditLogs.length === 0 && !isLoading && (
              <div className="p-8 text-center text-content-secondary">
                No hay registros de auditoría disponibles.
              </div>
            )}
          </div>
          {auditLogsTotal > 20 && (
            <div className="card-footer flex items-center justify-between">
              <span className="text-sm text-content-secondary">
                Total: {auditLogsTotal} registros
              </span>
              <div className="flex gap-2">
                <button 
                  onClick={() => setAuditPage(p => Math.max(0, p - 1))}
                  disabled={auditPage === 0}
                  className="btn btn-secondary btn-sm"
                >
                  Anterior
                </button>
                <button 
                  onClick={() => setAuditPage(p => p + 1)}
                  disabled={(auditPage + 1) * 20 >= auditLogsTotal}
                  className="btn btn-secondary btn-sm"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
