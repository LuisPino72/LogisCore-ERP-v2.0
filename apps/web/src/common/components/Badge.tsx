import type { BadgeVariant } from "../types/common.types";

const variantClasses: Record<BadgeVariant, string> = {
  default: "badge-brand",
  success: "badge-success",
  warning: "badge-warning",
  error: "badge-error",
  info: "badge-info"
};

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  const variantClass = variantClasses[variant] ?? variantClasses.default;
  return (
    <span className={`badge ${variantClass} ${className}`}>
      {children}
    </span>
  );
}
