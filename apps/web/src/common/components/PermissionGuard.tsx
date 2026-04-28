import React from "react";
import { usePermissions } from "@/lib/permissions/usePermissions";
import { Card, Badge } from "@/common";

interface PermissionGuardProps {
  children: React.ReactNode;
  permission?: string;
  moduleAccess?: keyof ReturnType<typeof usePermissions>;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({ children, permission, moduleAccess }) => {
  const perms = usePermissions();

  const hasAccess = React.useMemo(() => {
    if (permission) {
      return perms.hasPermission(permission);
    }
    if (moduleAccess && typeof perms[moduleAccess] === "boolean") {
      return perms[moduleAccess] as boolean;
    }
    return true;
  }, [perms, permission, moduleAccess]);

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6">
        <Card className="max-w-md w-full text-center p-8 space-y-4">
          <div className="flex justify-center mb-4">
            <Badge variant="error" className="px-4 py-2 text-lg">Acceso Restringido</Badge>
          </div>
          <h2 className="text-2xl font-bold text-gray-800">No tienes permiso</h2>
          <p className="text-gray-600">
            Tu usuario actual no cuenta con los privilegios necesarios para acceder a este módulo. 
            Por favor, contacta con el administrador del sistema si crees que esto es un error.
          </p>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
