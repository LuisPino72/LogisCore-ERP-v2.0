/**
 * Formulario de nuevos empleados.
 */

import type { EmployeeInput } from "../TenantForm";
import { VALIDATION_RULES } from "@/common";

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
                <button 
                  type="button" 
                  onClick={() => onRemove(index)}
                  className="text-xs text-state-error hover:text-state-error/70"
                >
                  Eliminar
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">Email</label>
                <input
                  type="email"
                  className={`input ${errors[`employee_${index}_email`] ? "border-state-error" : ""}`}
                  value={employee.email}
                  onChange={(e) => onUpdateEmployee(index, "email", e.target.value)}
                  placeholder="empleado@empresa.com"
                />
                {errors[`employee_${index}_email`] && (
                  <p className="text-xs text-state-error mt-1">{errors[`employee_${index}_email`]}</p>
                )}
              </div>
              <div>
                <label className="label text-xs">Nombre Completo</label>
                <input
                  type="text"
                  className={`input ${errors[`employee_${index}_fullName`] ? "border-state-error" : ""}`}
                  value={employee.fullName}
                  onChange={(e) => onUpdateEmployee(index, "fullName", e.target.value)}
                  placeholder="María García"
                  maxLength={VALIDATION_RULES.MAX_TEXT_LENGTH}
                />
                {errors[`employee_${index}_fullName`] && (
                  <p className="text-xs text-state-error mt-1">{errors[`employee_${index}_fullName`]}</p>
                )}
              </div>
              <div className="col-span-2">
                <label className="label text-xs">Contraseña</label>
                <input
                  type="password"
                  className={`input ${errors[`employee_${index}_password`] ? "border-state-error" : ""}`}
                  value={employee.password}
                  onChange={(e) => onUpdateEmployee(index, "password", e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
                {errors[`employee_${index}_password`] && (
                  <p className="text-xs text-state-error mt-1">{errors[`employee_${index}_password`]}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <button 
        type="button" 
        onClick={onAdd}
        className="mt-3 btn btn-secondary text-sm"
      >
        + Agregar Otro
      </button>
    </div>
  );
}