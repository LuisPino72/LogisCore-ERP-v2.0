import type { BadgeVariant } from "../types/common.types";

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-surface-100 text-content-secondary",
  success: "bg-brand-100 text-brand-700",
  warning: "bg-amber-100 text-amber-700",
  error: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700"
};

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  const variantClass = variantClasses[variant] ?? variantClasses.default;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClass} ${className}`}>
      {children}
    </span>
  );
}
