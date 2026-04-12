/**
 * Sección de empleados existentes (para edición de tenant).
 */

import type { EmployeeManagement } from "../TenantForm";
import { VALIDATION_RULES } from "@/common";

interface ExistingEmployeesSectionProps {
  formData: { existingEmployees: EmployeeManagement[] };
  errors: Record<string, string>;
  onUpdateEmployee: (index: number, field: string, value: string | boolean) => void;
  onMarkForDeletion: (index: number) => void;
  onAddNew: () => void;
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
              <button 
                type="button" 
                onClick={() => onMarkForDeletion(index)}
                className="text-xs text-state-error hover:text-state-error/70"
              >
                Eliminar
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label text-xs">Nombre Completo</label>
                <input
                  type="text"
                  className={`input ${errors[`existing_${index}_fullName`] ? "border-state-error" : ""}`}
                  value={employee.fullName}
                  onChange={(e) => onUpdateEmployee(index, "fullName", e.target.value)}
                  placeholder="María García"
                  maxLength={VALIDATION_RULES.MAX_TEXT_LENGTH}
                />
                {errors[`existing_${index}_fullName`] && (
                  <p className="text-xs text-state-error mt-1">{errors[`existing_${index}_fullName`]}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <button 
        type="button" 
        onClick={onAddNew}
        className="mt-3 btn btn-secondary text-sm"
      >
        + Agregar Nuevo Empleado
      </button>
    </div>
  );
}