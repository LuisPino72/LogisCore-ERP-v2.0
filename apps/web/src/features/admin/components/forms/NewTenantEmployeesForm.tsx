/**
 * Formulario de empleados para nuevo tenant.
 */

import type { EmployeeInput } from "../TenantForm";
import { VALIDATION_RULES } from "@/common";
import { Button } from "@/common/components/Button";
import { Input } from "@/common/components/FormField";

interface NewTenantEmployeesFormProps {
  formData: { employees: EmployeeInput[] };
  errors: Record<string, string>;
  onUpdateEmployee: (index: number, field: string, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}

export function NewTenantEmployeesForm({ 
  formData, 
  errors, 
  onUpdateEmployee, 
  onAdd,
  onRemove 
}: NewTenantEmployeesFormProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3 border-b pb-1">
        <h3 className="text-sm font-medium text-content-primary">Empleados</h3>
        <Button type="button" onClick={onAdd} variant="secondary" size="sm" className="py-1 px-2">
          + Agregar
        </Button>
      </div>
      <div className="space-y-4">
        {formData.employees.map((employee, index) => (
          <div key={index} className="p-3 bg-surface-50 rounded-lg border">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium text-content-secondary">Empleado {index + 1}</span>
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
                  onChange={(e) => onUpdateEmployee(index, "email", e.target.value)}
                  placeholder="empleado@empresa.com"
                />
              </div>
              <div>
                <label className="label text-xs">Nombre Completo</label>
                <Input
                  type="text"
                  error={errors[`employee_${index}_fullName`] || ""}
                  value={employee.fullName}
                  onChange={(e) => onUpdateEmployee(index, "fullName", e.target.value)}
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
                  onChange={(e) => onUpdateEmployee(index, "password", e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}