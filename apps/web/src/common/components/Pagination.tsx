import type { PaginationState } from "../types/common.types";

export interface PaginationProps {
  pagination: PaginationState;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  showPageSize?: boolean;
}

export function Pagination({
  pagination,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  showPageSize = true
}: PaginationProps) {
  const { page, pageSize, total } = pagination;
  const totalPages = Math.ceil(total / pageSize);
  const start = total > 0 ? (page - 1) * pageSize + 1 : 0;
  const end = Math.min(page * pageSize, total);

  if (total === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white border-t border-surface-200">
      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
        {showPageSize && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-content-secondary hidden xs:inline">Mostrar</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
              className="px-2 py-1 text-sm border border-surface-300 rounded focus:outline-none focus:border-brand-500"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <span className="text-sm text-content-secondary hidden xs:inline">registros</span>
          </div>
        )}
        <span className="text-xs sm:text-sm text-content-secondary">
          {start}-{end} de {total}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          className="p-2 text-sm text-content-secondary hover:bg-surface-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="p-2 text-sm text-content-secondary hover:bg-surface-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="px-3 text-sm text-content-primary">
          Página {page} de {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-2 text-sm text-content-secondary hover:bg-surface-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages}
          className="p-2 text-sm text-content-secondary hover:bg-surface-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
