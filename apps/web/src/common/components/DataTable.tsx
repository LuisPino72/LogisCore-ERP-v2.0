import { memo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
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

export const DataTable = memo(function DataTable<T>({
  columns,
  data,
  sort,
  onSort,
  onRowClick,
  emptyMessage = "No hay datos",
  loading
}: DataTableProps<T>) {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const shouldVirtualize = data.length > 100;
  
  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 48,
    overscan: 10,
    enabled: shouldVirtualize
  });

  const getValue = (row: T, key: string): unknown => {
    const keys = key.split(".");
    let value: unknown = row;
    for (const k of keys) {
      value = (value as Record<string, unknown>)?.[k];
    }
    return value;
  };

  const renderRow = (row: T, rowIndex: number, key: string) => (
    <tr
      key={key}
      className="hover:bg-surface-50 transition-colors"
      onClick={() => onRowClick?.(row)}
    >
      {columns.map((col) => {
        const value = getValue(row, col.key);
        return (
          <td
            key={col.key}
            className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-content-primary whitespace-nowrap overflow-hidden text-ellipsis"
          >
            {col.render ? col.render(value, row) : String(value ?? "")}
          </td>
        );
      })}
    </tr>
  );

  const _renderVirtualRow = (row: T, index: number) => (
    <tr
      data-index={index}
      className="hover:bg-surface-50 transition-colors"
      onClick={() => onRowClick?.(row)}
    >
      {columns.map((col) => {
        const value = getValue(row, col.key);
        return (
          <td
            key={col.key}
            className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-content-primary whitespace-nowrap overflow-hidden text-ellipsis"
          >
            {col.render ? col.render(value, row) : String(value ?? "")}
          </td>
        );
      })}
    </tr>
  );

  return (
    <div className="overflow-x-auto border border-surface-200 rounded-lg">
      <table className="w-full min-w-[600px]">
        <thead className="bg-surface-50 sticky top-0 z-10">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium text-content-primary ${
                  col.width ? `w-${col.width}` : ""
                } ${
                  col.sortable ? "cursor-pointer hover:bg-surface-100" : ""
                }`}
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
          ) : shouldVirtualize ? (
            <tr>
              <td colSpan={columns.length} className="p-0">
                <div
                  ref={tableContainerRef}
                  className="overflow-auto"
                  style={{ height: "400px" }}
                >
                  <table className="w-full">
                    <tbody className="divide-y divide-surface-200">
                      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                        const row = data[virtualRow.index];
                        if (!row) return null;
                        return (
                          <tr
                            key={virtualRow.key}
                            data-index={virtualRow.index}
                            className="hover:bg-surface-50 transition-colors"
                            style={{
                              transform: `translateY(${virtualRow.start}px)`,
                              height: `${virtualRow.size}px`
                            }}
                            onClick={() => onRowClick?.(row)}
                          >
                            {columns.map((col) => {
                              const value = getValue(row, col.key);
                              return (
                                <td
                                  key={col.key}
                                  className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-content-primary whitespace-nowrap overflow-hidden text-ellipsis"
                                >
                                  {col.render ? col.render(value, row) : String(value ?? "")}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => renderRow(row, rowIndex, `row-${rowIndex}`))
          )}
        </tbody>
      </table>
    </div>
  );
});