import React from "react";

interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export const StatCard = ({
  label,
  value,
  icon,
  trend,
  className = "",
  ...props
}: StatCardProps) => {
  return (
    <div className={`stat-card ${className}`} {...props}>
      <div className="flex items-center justify-between">
        <div>
          <p className="stat-label">{label}</p>
          <p className="stat-value">{value}</p>
        </div>
        {icon && (
          <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center">
            {icon}
          </div>
        )}
      </div>
      {trend && (
        <div className={`text-xs mt-2 ${trend.isPositive ? "text-state-success" : "text-state-error"}`}>
          {trend.isPositive ? "↑" : "↓"} {trend.value} vs last month
        </div>
      )}
    </div>
  );
};
