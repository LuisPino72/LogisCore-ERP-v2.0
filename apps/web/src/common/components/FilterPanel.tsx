import type { ReactNode } from "react";

export interface FilterItem {
  key: string;
  label: string;
  component: ReactNode;
}

export interface FilterPanelProps {
  filters: FilterItem[];
  onClear?: () => void;
}

export function FilterPanel({ filters, onClear }: FilterPanelProps) {
  const hasFilters = filters.some((f) => f.component);

  return (
    <div className="flex flex-wrap items-center gap-3 p-3 bg-surface-50 rounded-lg">
      {filters.map((filter) => (
        <div key={filter.key} className="flex items-center gap-2">
          <span className="text-sm text-content-secondary">{filter.label}:</span>
          {filter.component}
        </div>
      ))}
      {hasFilters && onClear && (
        <button
          onClick={onClear}
          className="text-sm text-brand-600 hover:text-brand-700 font-medium"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
