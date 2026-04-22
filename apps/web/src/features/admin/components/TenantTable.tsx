import { useMemo } from "react";
import type { Tenant, SecurityUser } from "../types/admin.types";
import { Button } from "@/common/components/Button";
import { Badge } from "@/common/components/Badge";
import { DataTable } from "@/common/components/DataTable";
import type { TableColumn } from "@/common/types/common.types";

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

  const columns: TableColumn<Tenant>[] = [
    { 
      key: "name", 
      header: "Empresa", 
      width: "2fr",
      render: (value, row) => (
        <div className="flex items-center gap-3">
          {row.logoUrl ? (
            <img src={row.logoUrl} alt={String(value)} className="w-10 h-10 rounded-lg object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center text-brand-600 font-bold">
              {String(value).charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <span className="font-medium text-content-primary block">{String(value)}</span>
            <span className="text-xs text-content-tertiary">{row.slug}</span>
          </div>
        </div>
      )
    },
    { 
      key: "ownerUserId", 
      header: "Owner", 
      width: "1fr",
      render: (value) => (
        <span className="text-sm text-content-secondary">
          {ownerEmailMap.get(String(value)) || "Sin owner"}
        </span>
      )
    },
    { 
      key: "isActive", 
      header: "Estado", 
      width: "0.75fr",
      render: (value) => (
        <Badge variant={value ? "success" : "error"}>
          {value ? "Activo" : "Inactivo"}
        </Badge>
      )
    },
    { 
      key: "actions", 
      header: "Acciones", 
      width: "1.2fr",
      render: (_, row) => (
        <div className="flex gap-3">
          <Button onClick={() => onAccess(row)} variant="ghost" size="sm">Entrar</Button>
          <Button onClick={() => onEdit(row)} variant="ghost" size="sm">Editar</Button>
          {row.isActive ? (
            <Button onClick={() => onDeactivate(row)} variant="ghost" size="sm">Desactivar</Button>
          ) : (
            <Button onClick={() => onDelete(row.id, true)} variant="ghost" size="sm">Eliminar</Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="card">
      <div className="card-body p-0">
        <DataTable
          columns={columns}
          data={tenants}
          loading={false}
        />
      </div>
    </div>
  );
}
