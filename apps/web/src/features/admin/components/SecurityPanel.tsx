import { useState, useEffect } from "react";
import type { SecurityUser, AuditLogEntry } from "../types/admin.types";
import { Badge } from "@/common/components/Badge";
import { Button } from "@/common/components/Button";
import { Card } from "@/common/components/Card";
import { Tabs } from "@/common/components/Tabs";

interface SecurityPanelProps {
  users: SecurityUser[];
  isLoading: boolean;
  onRefresh: () => void;
  auditLogs?: AuditLogEntry[];
  auditLogsTotal?: number;
  onLoadAuditLogs?: (limit?: number, offset?: number) => void;
}

export function SecurityPanel({ 
  users, 
  isLoading, 
  onRefresh, 
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

  const getActionBadgeVariant = (action: string): "default" | "success" | "warning" | "error" | "info" => {
    if (action.includes("FAILED")) return "error";
    if (action.includes("DELETE")) return "warning";
    if (action.includes("CREATE")) return "success";
    if (action.includes("LOGIN") || action.includes("LOGOUT")) return "info";
    return "default";
  };

  return (
    <div className="stack-md">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-content-primary">Seguridad y Accesos</h1>
          <p className="text-content-secondary">Visualización de usuarios y registros de auditoría</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={onRefresh} disabled={isLoading} variant="secondary">
            {isLoading ? <span className="spinner" /> : "Actualizar"}
          </Button>
        </div>
      </div>

          <Tabs
            activeTab={activeTab}
            onChange={(tab) => setActiveTab(tab as "users" | "audit")}
            items={[
          { id: "users", label: "Directorio Global de Usuarios" },
          { id: "audit", label: "Registros de Auditoría" }
        ]}
      />

      {activeTab === "users" && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-50 sticky top-0">
                <tr className="border-b border-surface-200">
                  <th className="text-left px-4 py-3 font-medium text-content-primary">Usuario</th>
                  <th className="text-left px-4 py-3 font-medium text-content-primary">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-content-primary">Tenant</th>
                  <th className="text-left px-4 py-3 font-medium text-content-primary">Rol</th>
                  <th className="text-left px-4 py-3 font-medium text-content-primary">Estado</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="border-b border-surface-100 hover:bg-surface-50">
                    <td className="px-4 py-3 font-medium text-content-primary">{user.fullName || "—"}</td>
                    <td className="px-4 py-3 text-content-secondary">{user.email}</td>
                    <td className="px-4 py-3 text-content-secondary">{user.tenantName || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={user.role === 'admin' ? "warning" : "info"}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={user.isActive ? "success" : "error"}>
                        {user.isActive ? "Activo" : "Eliminado"}
                      </Badge>
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
        </Card>
      )}

      {activeTab === "audit" && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-50 sticky top-0">
                <tr className="border-b border-surface-200">
                  <th className="text-left px-4 py-3 font-medium text-content-primary">Fecha/Hora</th>
                  <th className="text-left px-4 py-3 font-medium text-content-primary">Acción</th>
                  <th className="text-left px-4 py-3 font-medium text-content-primary">Usuario</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map(log => (
                  <tr key={log.id} className="border-b border-surface-100 hover:bg-surface-50">
                    <td className="px-4 py-3 text-content-secondary whitespace-nowrap">{formatDate(log.timestamp)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={getActionBadgeVariant(log.action)}>
                        {formatAction(log.action)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-content-primary">{log.email || log.userId || "—"}</td>
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
                <Button 
                  onClick={() => setAuditPage(p => Math.max(0, p - 1))}
                  disabled={auditPage === 0}
                  variant="secondary"
                  size="sm"
                >
                  Anterior
                </Button>
                <Button 
                  onClick={() => setAuditPage(p => p + 1)}
                  disabled={(auditPage + 1) * 20 >= auditLogsTotal}
                  variant="secondary"
                  size="sm"
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
