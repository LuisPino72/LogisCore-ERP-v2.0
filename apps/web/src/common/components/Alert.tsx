import React from "react";

export type AlertVariant = "success" | "error" | "warning" | "info";

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant: AlertVariant;
  title?: string;
  icon?: React.ReactNode;
}

export const Alert = ({
  children,
  variant,
  title,
  icon,
  className = "",
  ...props
}: AlertProps) => {
  return (
    <div 
      className={`alert alert-${variant} ${className}`} 
      {...props}
    >
      {icon && <div className="shrink-0">{icon}</div>}
      <div>
        {title && <div className="font-bold mb-1">{title}</div>}
        {children}
      </div>
    </div>
  );
};
