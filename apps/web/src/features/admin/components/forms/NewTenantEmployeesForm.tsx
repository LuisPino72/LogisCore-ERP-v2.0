/**
 * Formulario de empleados para nuevo tenant.
 */

import type { EmployeeInput } from "../TenantForm";
import { VALIDATION_RULES } from "@/common";

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
        <button type="button" onClick={onAdd} className="btn btn-secondary text-sm py-1 px-2">
          + Agregar
        </button>
      </div>
      <div className="space-y-4">
        {formData.employees.map((employee, index) => (
          <div key={index} className="p-3 bg-surface-50 rounded-lg border">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium text-content-secondary">Empleado {index + 1}</span>
              {formData.employees.length > 1 && (
                <button 
                  type="button" 
                  onClick={() => onRemove(index)}
                  className="text-xs text-red-500 hover:text-red-700"
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
                  className={`input ${errors[`employee_${index}_email`] ? "border-red-500" : ""}`}
                  value={employee.email}
                  onChange={(e) => onUpdateEmployee(index, "email", e.target.value)}
                  placeholder="empleado@empresa.com"
                />
                {errors[`employee_${index}_email`] && (
                  <p className="text-xs text-red-500 mt-1">{errors[`employee_${index}_email`]}</p>
                )}
              </div>
              <div>
                <label className="label text-xs">Nombre Completo</label>
                <input
                  type="text"
                  className={`input ${errors[`employee_${index}_fullName`] ? "border-red-500" : ""}`}
                  value={employee.fullName}
                  onChange={(e) => onUpdateEmployee(index, "fullName", e.target.value)}
                  placeholder="María García"
                  maxLength={VALIDATION_RULES.MAX_TEXT_LENGTH}
                />
                {errors[`employee_${index}_fullName`] && (
                  <p className="text-xs text-red-500 mt-1">{errors[`employee_${index}_fullName`]}</p>
                )}
              </div>
              <div className="col-span-2">
                <label className="label text-xs">Contraseña</label>
                <input
                  type="password"
                  className={`input ${errors[`employee_${index}_password`] ? "border-red-500" : ""}`}
                  value={employee.password}
                  onChange={(e) => onUpdateEmployee(index, "password", e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
                {errors[`employee_${index}_password`] && (
                  <p className="text-xs text-red-500 mt-1">{errors[`employee_${index}_password`]}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}