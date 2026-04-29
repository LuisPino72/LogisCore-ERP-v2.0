/**
 * Sección de empleados existentes (para edición de tenant).
 */

import type { EmployeeManagement } from "../TenantForm";
import { VALIDATION_RULES } from "@/common";
import { PERMISSIONS, PERMISSION_MODULES } from "@/lib/permissions/rbac-constants";
import { Button } from "@/common/components/Button";
import { Input } from "@/common/components/FormField";
import { Checkbox } from "@/common";

interface ExistingEmployeesSectionProps {
  formData: { existingEmployees: EmployeeManagement[] };
  errors: Record<string, string>;
  onUpdateEmployee: (index: number, field: string, value: string | boolean | string[]) => void;
  onMarkForDeletion: (index: number) => void;
  onAddNew: () => void;
}

function PermissionsChecklist({ 
  selectedPermissions, 
  onChange 
}: { 
  selectedPermissions: string[]; 
  onChange: (perms: string[]) => void;
}) {
  const handleToggle = (perm: string) => {
    if (selectedPermissions.includes(perm)) {
      onChange(selectedPermissions.filter(p => p !== perm));
    } else {
      onChange([...selectedPermissions, perm]);
    }
  };

  const EMPLOYEE_VISIBLE_MODULES = PERMISSION_MODULES.filter(
    m => m !== "CONFIG" && m !== "ADMIN"
  );

  return (
    <div className="mt-3 space-y-3">
      <h4 className="text-xs font-medium text-content-secondary">Permisos del Empleado</h4>
      {EMPLOYEE_VISIBLE_MODULES.map(module => {
        const modulePerms = PERMISSIONS[module as keyof typeof PERMISSIONS];
        const permsList = Object.values(modulePerms);
        
        return (
          <div key={module} className="border-l-2 border-surface-200 pl-3">
            <h5 className="text-xs font-semibold text-content-primary mb-1">{module}</h5>
            <div className="flex flex-wrap gap-2">
              {permsList.map(perm => (
                <label key={perm} className="flex items-center gap-1 text-xs">
                  <Checkbox
                    label={perm.split(":")[1]}
                    checked={selectedPermissions.includes(perm)}
                    onChange={() => handleToggle(perm)}
                  />
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ExistingEmployeesSection({ 
  formData, 
  errors, 
  onUpdateEmployee, 
  onMarkForDeletion,
  onAddNew 
}: ExistingEmployeesSectionProps) {
  if (formData.existingEmployees.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3 border-b pb-1">
        <h3 className="text-sm font-medium text-content-primary">Empleados Existentes</h3>
      </div>
      <div className="space-y-3">
        {formData.existingEmployees.map((employee, index) => (
          <div key={employee.userId || index} className="p-3 bg-surface-50 rounded-lg border">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${employee.isActive ? 'bg-state-success' : 'bg-state-error'}`}></span>
                <span className="text-xs font-medium text-content-secondary">{employee.email}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onMarkForDeletion(index)}
                className="text-state-error"
              >
                Eliminar
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label text-xs">Nombre Completo</label>
                <Input
                  type="text"
                  error={errors[`existing_${index}_fullName`] || ""}
                  value={employee.fullName}
                  onChange={(e) => onUpdateEmployee(index, "fullName", (e.target as HTMLInputElement).value)}
                  placeholder="María García"
                  maxLength={VALIDATION_RULES.MAX_TEXT_LENGTH}
                />
              </div>
              <div className="col-span-2">
                <label className="flex items-center gap-2 text-xs">
                  <Checkbox
                    label="Activo"
                    checked={employee.isActive}
                    onChange={(checked) => onUpdateEmployee(index, "isActive", checked)}
                  />
                </label>
              </div>
            </div>
            <PermissionsChecklist 
              selectedPermissions={employee.permissions || []}
              onChange={(perms) => onUpdateEmployee(index, "permissions", perms)}
            />
          </div>
        ))}
      </div>
      <Button
        type="button"
        onClick={onAddNew}
        variant="secondary"
        size="sm"
        className="mt-3"
      >
        + Agregar Nuevo Empleado
      </Button>
    </div>
  );
}