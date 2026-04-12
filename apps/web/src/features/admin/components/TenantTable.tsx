import { useMemo } from "react";
import type { Tenant, SecurityUser } from "../types/admin.types";

interface TenantTableProps {
  tenants: Tenant[];
  securityUsers: SecurityUser[];
  onEdit: (tenant: Tenant) => void;
  onDelete: (id: string, permanent?: boolean) => void;
  onDeactivate: (tenant: Tenant) => void;
  onAccess: (tenant: Tenant) => void;
}

export function TenantTable({ tenants, securityUsers, onEdit, onDelete, onDeactivate, onAccess }: TenantTableProps) {
  const ownerEmailMap = useMemo(
    () => new Map(securityUsers.map(u => [u.userId, u.email])),
    [securityUsers]
  );

  return (
    <div className="card">
      <div className="card-body p-0 overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface-100 text-left">
            <tr>
              <th className="px-4 py-3 text-sm font-medium text-content-secondary">Empresa</th>
              <th className="px-4 py-3 text-sm font-medium text-content-secondary">Owner</th>
              <th className="px-4 py-3 text-sm font-medium text-content-secondary">Estado</th>
              <th className="px-4 py-3 text-sm font-medium text-content-secondary">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tenants.map(tenant => (
              <tr key={tenant.id} className="hover:bg-surface-50 group">
                <td className="px-4 py-3">
                   <div className="flex items-center gap-3">
                      {tenant.logoUrl ? (
                         <img src={tenant.logoUrl} alt={tenant.name} className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                         <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center text-brand-600 font-bold">
                            {tenant.name.charAt(0).toUpperCase()}
                         </div>
                      )}
                      <div>
                        <span className="font-medium text-content-primary block">{tenant.name}</span>
                        <span className="text-xs text-content-tertiary">{tenant.slug}</span>
                      </div>
                   </div>
                </td>
                <td className="px-4 py-3 text-sm text-content-secondary">
                   {ownerEmailMap.get(tenant.ownerUserId) || "Sin owner"}
                </td>
                <td className="px-4 py-3">
                   <span className={`badge ${tenant.isActive ? "badge-success" : "badge-error"}`}>
                      {tenant.isActive ? "Activo" : "Inactivo"}
                   </span>
                </td>
                <td className="px-4 py-3">
                   <div className="flex gap-3">
                      <button onClick={() => onAccess(tenant)} className="text-sm text-brand-600 hover:text-brand-700 font-medium">Entrar</button>
                      <button onClick={() => onEdit(tenant)} className="text-sm text-content-secondary hover:text-content-primary">Editar</button>
                      {tenant.isActive ? (
                        <button onClick={() => onDeactivate(tenant)} className="text-sm text-state-warning hover:text-state-warning/70">Desactivar</button>
                      ) : (
                        <button onClick={() => onDelete(tenant.id, true)} className="text-sm text-state-error hover:text-state-error/70">Eliminar</button>
                      )}
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
