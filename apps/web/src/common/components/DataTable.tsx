import type { TableColumn, SortState } from "../types/common.types";

export interface DataTableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  sort?: SortState;
  onSort?: (column: string) => void;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  loading?: boolean;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  sort,
  onSort,
  onRowClick,
  emptyMessage = "No hay datos",
  loading
}: DataTableProps<T>) {
  const getValue = (row: T, key: string): unknown => {
    const keys = key.split(".");
    let value: unknown = row;
    for (const k of keys) {
      value = (value as Record<string, unknown>)?.[k];
    }
    return value;
  };

  const alignClasses = {
    left: "text-left",
    center: "text-center",
    right: "text-right"
  };

  return (
    <div className="overflow-x-auto border border-surface-200 rounded-lg">
      <table className="w-full">
        <thead className="bg-surface-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-sm font-medium text-content-primary ${col.width ? `w-${col.width}` : ""} ${
                  col.sortable ? "cursor-pointer hover:bg-surface-100" : ""
                } ${alignClasses[col.align ?? "left"]}`}
                onClick={() => col.sortable && onSort?.(col.key)}
              >
                <div className="flex items-center gap-1">
                  {col.header}
                  {col.sortable && sort?.column === col.key && (
                    <span className="text-brand-500">{sort.direction === "asc" ? "↑" : "↓"}</span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-200">
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-content-secondary">
                Cargando...
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-content-secondary">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={`hover:bg-surface-50 transition-colors ${onRowClick ? "cursor-pointer" : ""}`}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => {
                  const value = getValue(row, col.key);
                  return (
                    <td
                      key={col.key}
                      className={`px-4 py-3 text-sm text-content-primary ${alignClasses[col.align ?? "left"]}`}
                    >
                      {col.render ? col.render(value, row) : String(value ?? "")}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
