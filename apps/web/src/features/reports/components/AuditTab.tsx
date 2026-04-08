import { useMemo } from "react";
import type { AuditLogWithUser } from "../types/reports.types";
import { Badge } from "@/common/components/Badge";
import { ShieldAlert, ShieldCheck, User, Clock, Table2 } from "lucide-react";

interface AuditTabProps {
  auditLogs: AuditLogWithUser[];
  isLoading: boolean;
}

const severityColors: Record<string, "error" | "warning" | "info" | "success"> = {
  critical: "error",
  high: "error",
  medium: "warning",
  low: "info"
};

const eventTypeLabels: Record<string, string> = {
  SALE_COMPLETED: "Venta Completada",
  SALE_VOIDED: "Venta Anulada",
  SALE_REFUNDED: "Venta Reembolsada",
  INVENTORY_ADJUSTMENT: "Ajuste de Inventario",
  BOX_OPENED: "Caja Abierta",
  BOX_CLOSED: "Caja Cerrada",
  USER_LOGIN: "Inicio de Sesión",
  USER_LOGOUT: "Cierre de Sesión",
  PRODUCT_CREATED: "Producto Creado",
  PRODUCT_UPDATED: "Producto Actualizado",
  INVOICE_ISSUED: "Factura Emitida",
  INVOICE_VOIDED: "Factura Anulada",
  PRODUCTION_STARTED: "Producción Iniciada",
  PRODUCTION_COMPLETED: "Producción Completada"
};

export function AuditTab({ auditLogs, isLoading }: AuditTabProps) {
  const logsWithUser = useMemo(() => {
    return auditLogs.map((log) => ({
      ...log,
      userName: log.userName || log.userId?.slice(0, 8) || "Sistema",
      userEmail: log.userEmail || "",
      severity: getSeverity(log.eventType, log.success)
    }));
  }, [auditLogs]);

  function getSeverity(eventType: string, success: boolean): "low" | "medium" | "high" | "critical" {
    if (!success) return "critical";
    if (eventType.includes("VOID") || eventType.includes("ADJUSTMENT")) return "high";
    if (eventType.includes("LOGIN") || eventType.includes("LOGOUT")) return "low";
    return "medium";
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("es-VE", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const criticalCount = useMemo(
    () => logsWithUser.filter((l) => l.severity === "critical" || l.severity === "high").length,
    [logsWithUser]
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-state-info/10">
              <ShieldCheck className="w-5 h-5 text-state-info" />
            </div>
            <span className="text-xs font-medium text-content-tertiary uppercase tracking-wider">
              Total Registros
            </span>
          </div>
          <div className="stat-value text-state-info">{auditLogs.length}</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-state-error/10">
              <ShieldAlert className="w-5 h-5 text-state-error" />
            </div>
            <span className="text-xs font-medium text-content-tertiary uppercase tracking-wider">
              Críticos/Altos
            </span>
          </div>
          <div className={`stat-value ${criticalCount > 0 ? "text-state-error" : "text-state-success"}`}>
            {criticalCount}
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-state-success/10">
              <User className="w-5 h-5 text-state-success" />
            </div>
            <span className="text-xs font-medium text-content-tertiary uppercase tracking-wider">
              Acciones Exitosas
            </span>
          </div>
          <div className="stat-value text-state-success">
            {auditLogs.filter((l) => l.success).length}
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-surface-100">
              <Clock className="w-5 h-5 text-content-tertiary" />
            </div>
            <span className="text-xs font-medium text-content-tertiary uppercase tracking-wider">
              Último Registro
            </span>
          </div>
          <div className="stat-value text-content-secondary text-lg">
            {auditLogs.length > 0 ? formatDate(auditLogs[0].createdAt).split(",")[0] : "—"}
          </div>
        </div>
      </div>

      <div className="border border-surface-200 rounded-lg overflow-hidden">
        <div className="bg-surface-50 border-b border-surface-200 grid grid-cols-6 gap-2 px-4 py-3 text-xs font-semibold text-content-secondary uppercase tracking-wider">
          <div className="col-span-1">Fecha</div>
          <div className="col-span-1">Usuario</div>
          <div className="col-span-2">Evento</div>
          <div className="col-span-1">Tabla</div>
          <div className="col-span-1 text-center">Resultado</div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="spinner" />
            <span className="ml-3 text-content-secondary">Cargando logs de auditoría...</span>
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-content-tertiary">
            <ShieldAlert className="w-8 h-8 mb-2" />
            <span>No hay registros de auditoría</span>
          </div>
        ) : (
          <div className="max-h-[400px] overflow-auto">
            {logsWithUser.map((log) => (
              <div
                key={log.localId}
                className="grid grid-cols-6 gap-2 px-4 py-3 border-b border-surface-100 hover:bg-surface-50 transition-colors"
              >
                <div className="col-span-1 text-sm text-content-secondary">
                  {formatDate(log.createdAt)}
                </div>
                <div className="col-span-1 text-sm text-content-primary">
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3 text-content-tertiary" />
                    {log.userName}
                  </div>
                  {log.userEmail && (
                    <div className="text-xs text-content-tertiary">{log.userEmail}</div>
                  )}
                </div>
                <div className="col-span-2 text-sm">
                  <Badge variant={severityColors[log.severity] || "info"}>
                    {eventTypeLabels[log.eventType] || log.eventType}
                  </Badge>
                </div>
                <div className="col-span-1 text-sm text-content-secondary">
                  <div className="flex items-center gap-1">
                    <Table2 className="w-3 h-3" />
                    {log.targetTable || "—"}
                  </div>
                </div>
                <div className="col-span-1 flex justify-center">
                  <Badge variant={log.success ? "success" : "error"}>
                    {log.success ? "Éxito" : "Fallo"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export { AuditTabProps as AuditTab };
