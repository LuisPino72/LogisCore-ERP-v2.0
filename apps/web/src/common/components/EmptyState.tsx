export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && <div className="mb-4 text-content-tertiary">{icon}</div>}
      <h3 className="text-lg font-semibold text-content-primary mb-1">{title}</h3>
      {description && <p className="text-sm text-content-secondary mb-4 max-w-sm">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}

export interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  message?: string;
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8"
};

export function LoadingSpinner({ size = "md", message }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <svg className={`animate-spin text-brand-500 ${sizeClasses[size]}`} fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      {message && <p className="text-sm text-content-secondary">{message}</p>}
    </div>
  );
}

export interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ className = "", variant = "rectangular", width, height }: SkeletonProps) {
  const baseClasses = "animate-pulse bg-surface-200";
  const variantClasses = {
    text: "rounded",
    circular: "rounded-full",
    rectangular: "rounded-lg"
  };
  
  const style = {
    width: width ?? "100%",
    height: height ?? (variant === "text" ? "1em" : "100%")
  };
  
  return <div className={`${baseClasses} ${variantClasses[variant]} ${className}`} style={style} />;
}
