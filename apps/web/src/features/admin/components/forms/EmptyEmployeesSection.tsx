/**
 * Sección mostrada cuando no hay empleados (para edición de tenant).
 */

interface EmptyEmployeesSectionProps {
  onAdd: () => void;
}

export function EmptyEmployeesSection({ onAdd }: EmptyEmployeesSectionProps) {
  return (
    <div>
      <h3 className="text-sm font-medium text-content-primary mb-3 border-b pb-1">Empleados</h3>
      <p className="text-sm text-content-secondary mb-3">No hay empleados creados para este tenant.</p>
      <button 
        type="button" 
        onClick={onAdd}
        className="btn btn-secondary text-sm"
      >
        + Agregar Empleado
      </button>
    </div>
  );
}