/**
 * Formulario de nuevos empleados.
 */

import type { EmployeeInput } from "../TenantForm";
import { VALIDATION_RULES } from "@/common";
import { Button } from "@/common/components/Button";
import { Input } from "@/common/components/FormField";

interface NewEmployeesSectionProps {
  formData: { employees: EmployeeInput[] };
  errors: Record<string, string>;
  onUpdateEmployee: (index: number, field: string, value: string) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
}

export function NewEmployeesSection({ 
  formData, 
  errors, 
  onUpdateEmployee, 
  onRemove,
  onAdd 
}: NewEmployeesSectionProps) {
  if (formData.employees.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-medium text-content-primary mb-3 border-b pb-1">Nuevos Empleados</h3>
      <div className="space-y-4">
        {formData.employees.map((employee, index) => (
          <div key={`new-${index}`} className="p-3 bg-surface-50 rounded-lg border">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium text-content-secondary">Nuevo Empleado {index + 1}</span>
              {formData.employees.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(index)}
                  className="text-state-error"
                >
                  Eliminar
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">Email</label>
                <Input
                  type="email"
                  error={errors[`employee_${index}_email`] || ""}
                  value={employee.email}
                  onChange={(value) => onUpdateEmployee(index, "email", value)}
                  placeholder="empleado@empresa.com"
                />
              </div>
              <div>
                <label className="label text-xs">Nombre Completo</label>
                <Input
                  type="text"
                  error={errors[`employee_${index}_fullName`] || ""}
                  value={employee.fullName}
                  onChange={(value) => onUpdateEmployee(index, "fullName", value)}
                  placeholder="María García"
                  maxLength={VALIDATION_RULES.MAX_TEXT_LENGTH}
                />
              </div>
              <div className="col-span-2">
                <label className="label text-xs">Contraseña</label>
                <Input
                  type="password"
                  error={errors[`employee_${index}_password`] || ""}
                  value={employee.password}
                  onChange={(value) => onUpdateEmployee(index, "password", value)}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
<Button
          type="button"
          onClick={onAdd}
          variant="secondary"
          size="sm"
          className="mt-3"
        >
          + Agregar Otro
        </Button>
    </div>
  );
}