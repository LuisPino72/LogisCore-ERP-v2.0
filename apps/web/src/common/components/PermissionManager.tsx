import { useState } from "react";
import { Checkbox } from "./Checkbox";
import { Badge } from "./Badge";
import type { UserRole } from "@/features/tenant/types/tenant.types";
import { PERMISSIONS } from "@/lib/permissions/rbac-constants";

interface PermissionManagerProps {
  userRole: UserRole;
  onSave: (permissions: string[]) => Promise<void>;
  isSaving?: boolean;
}

export const PermissionManager = ({ userRole, onSave, isSaving }: PermissionManagerProps) => {
  const [selected, setSelected] = useState<string[]>(userRole.permissions?.permissions ?? []);
  const [isOpen, setIsOpen] = useState(false);

  const togglePermission = (perm: string) => {
    setSelected((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const handleSave = async () => {
    await onSave(selected);
    setIsOpen(false);
  };

  const groupedPermissions = Object.entries(PERMISSIONS).map(([module, perms]) => ({
    module,
    permissions: Object.values(perms),
  }));

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <div>
          <h3 className="card-title">Permisos</h3>
          <p className="text-sm text-content-secondary mt-1">
            {userRole.fullName || userRole.email}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={userRole.role === "owner" ? "brand" : "info"}>
            {userRole.role}
          </Badge>
          <button
            type="button"
            className="btn btn-ghost text-sm"
            onClick={() => setIsOpen(!isOpen)}
            disabled={userRole.role === "owner"}
          >
            {isOpen ? "Cerrar" : "Editar"}
          </button>
        </div>
      </div>

      {isOpen ? (
        <div className="card-body">
          <div className="space-y-4">
            {groupedPermissions.map(({ module, permissions }) => (
              <div key={module} className="border border-surface-200 rounded-lg p-4">
                <h4 className="label mb-3">{module}</h4>
                <div className="grid grid-cols-2 gap-2">
                  {permissions.map((perm) => (
                    <Checkbox
                      key={perm}
                      label={perm}
                      checked={selected.includes(perm)}
                      onChange={() => togglePermission(perm)}
                      disabled={userRole.role === "owner"}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-surface-200">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsOpen(false)}
              disabled={isSaving}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={isSaving || userRole.role === "owner"}
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <span className="spinner" />
                  Guardando...
                </span>
              ) : (
                "Guardar"
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="card-body">
          <div className="flex flex-wrap gap-2">
            {selected.length === 0 ? (
              <span className="text-content-tertiary text-sm">Sin permisos asignados</span>
            ) : (
              selected.map((perm) => (
                <Badge key={perm} variant="brand">
                  {perm}
                </Badge>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};