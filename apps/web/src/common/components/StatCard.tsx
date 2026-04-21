import React from "react";

interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  variant?: "blue" | "green" | "red" | "orange" | "purple" | "cyan" | "default";
}

const variantClasses = {
  blue: "stat-card-blue",
  green: "stat-card-green",
  red: "stat-card-red",
  orange: "stat-card-orange",
  purple: "stat-card-purple",
  cyan: "stat-card-cyan",
  default: "",
};

export const StatCard = ({
  label,
  value,
  icon,
  trend,
  variant = "default",
  className = "",
  ...props
}: StatCardProps) => {
  return (
    <div className={`stat-card ${variantClasses[variant]} ${className}`} {...props}>
      <div className="flex items-center justify-between">
        <div>
          <p className="stat-label">{label}</p>
          <p className="stat-value">{value}</p>
        </div>
        {icon && (
          <div className="stat-icon">
            {icon}
          </div>
        )}
      </div>
      {trend && (
        <div className={`text-xs mt-2 ${trend.isPositive ? "text-state-success" : "text-state-error"}`}>
          {trend.isPositive ? "↑" : "↓"} {trend.value}
        </div>
      )}
    </div>
  );
};
