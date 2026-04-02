import type { ReactNode } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

export interface ModalConfig {
  title: string;
  size?: ModalSize;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
}

export type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
  group?: string;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export interface SortState {
  column: string;
  direction: "asc" | "desc";
}

export interface FilterState {
  search: string;
  filters: Record<string, unknown>;
}

export interface TableColumn<T = unknown> {
  key: string;
  header: string;
  width?: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: unknown, row: T) => ReactNode;
  align?: "left" | "center" | "right";
}

export interface ConfirmDialogConfig {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "primary" | "danger";
}

export type BadgeVariant = "default" | "success" | "warning" | "error" | "info";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  active?: boolean;
}

export type DateFormat = "dd/MM/yyyy" | "MM/dd/yyyy" | "yyyy-MM-dd";
export type CurrencyFormat = "VES" | "USD" | "VES-USD";

export interface ErrorState {
  code: string;
  message: string;
  retryable?: boolean;
}

export interface LoadingState {
  initial: boolean;
  submitting: boolean;
  loading: boolean;
}
