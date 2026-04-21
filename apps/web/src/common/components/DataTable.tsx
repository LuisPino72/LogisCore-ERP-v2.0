import { memo, useRef, useMemo } from "react";
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
  virtualizerHeight?: number;
}

const getValue = <T,>(row: T, key: string): unknown => {
  const keys = key.split(".");
  let value: unknown = row;
  for (const k of keys) {
    value = (value as Record<string, unknown>)?.[k];
  }
  return value;
};

export const DataTable = memo(function DataTable<T>({
  columns,
  data,
  sort,
  onSort,
  onRowClick,
  emptyMessage = "No hay datos",
  loading,
  virtualizerHeight = 400
}: DataTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const shouldVirtualize = data.length > 100;

  const columnWidths = useMemo(() => {
    return columns.map((col) => col.width || "1fr").join(" ");
  }, [columns]);

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 10,
    enabled: shouldVirtualize
  });

  const renderCells = (row: T, _rowKey: string | number) => (
    <>
      {columns.map((col) => {
        const value = getValue(row, col.key);
        return (
          <div
            key={col.key}
            className="px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-content-primary whitespace-nowrap overflow-hidden text-ellipsis"
          >
            {col.render ? col.render(value, row) : String(value ?? "")}
          </div>
        );
      })}
    </>
  );

  if (shouldVirtualize) {
    return (
      <div className="border border-surface-200 rounded-lg overflow-hidden">
        <div
          className="grid gap-0 min-w-0"
          style={{
            gridTemplateColumns: columnWidths,
            minWidth: "min(600px, 100%)"
          }}
        >
          <div className="bg-surface-50 sticky top-0 z-10 grid" style={{ gridTemplateColumns: columnWidths }}>
            {columns.map((col) => (
              <div
                key={col.key}
                className={`px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium text-content-primary ${
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
              </div>
            ))}
          </div>
          
          {loading ? (
            <div
              className="col-span-full px-4 py-8 text-center text-content-secondary"
              style={{ gridColumn: `1 / -1` }}
            >
              Cargando...
            </div>
          ) : data.length === 0 ? (
            <div
              className="col-span-full px-4 py-8 text-center text-content-secondary"
              style={{ gridColumn: `1 / -1` }}
            >
              {emptyMessage}
            </div>
          ) : (
            <div
              ref={parentRef}
              className="overflow-auto"
              style={{ height: `${virtualizerHeight}px`, maxHeight: "60vh" }}
            >
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: "100%",
                  position: "relative"
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const row = data[virtualRow.index];
                  if (!row) return null;
                  return (
                    <div
                      key={virtualRow.key}
                      data-index={virtualRow.index}
                      className="grid hover:bg-surface-50 transition-colors cursor-pointer absolute w-full"
                      style={{
                        transform: `translateY(${virtualRow.start}px)`,
                        gridTemplateColumns: columnWidths,
                        height: `${virtualRow.size}px`
                      }}
                      onClick={() => onRowClick?.(row)}
                    >
                      {renderCells(row, virtualRow.index)}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-surface-200 rounded-lg">
      <div
        className="grid gap-0 min-w-0"
        style={{ gridTemplateColumns: columnWidths, minWidth: "min(600px, 100%)" }}
      >
        <div className="bg-surface-50 sticky top-0 z-10 grid" style={{ gridTemplateColumns: columnWidths }}>
          {columns.map((col) => (
            <div
              key={col.key}
              className={`px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm font-medium text-content-primary ${
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
            </div>
          ))}
        </div>

        {loading ? (
          <div
            className="col-span-full px-4 py-8 text-center text-content-secondary"
            style={{ gridColumn: `1 / -1` }}
          >
            Cargando...
          </div>
        ) : data.length === 0 ? (
          <div
            className="col-span-full px-4 py-8 text-center text-content-secondary"
            style={{ gridColumn: `1 / -1` }}
          >
            {emptyMessage}
          </div>
        ) : (
          data.map((row, rowIndex) => (
            <div
              key={`row-${rowIndex}`}
              className="grid hover:bg-surface-50 transition-colors cursor-pointer"
              style={{ gridTemplateColumns: columnWidths }}
              onClick={() => onRowClick?.(row)}
            >
              {renderCells(row, rowIndex)}
            </div>
          ))
        )}
      </div>
    </div>
  );
});