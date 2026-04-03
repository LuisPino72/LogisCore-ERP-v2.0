import type { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: number;
    isUp: boolean;
  };
  color?: "blue" | "green" | "red" | "purple" | "orange";
}

export function StatCard({ title, value, icon, trend, color = "blue" }: StatCardProps) {
  const colorClasses = {
    blue: "from-brand-500/10 to-brand-600/5 text-brand-600 border-brand-200/50",
    green: "from-brand-500/10 to-brand-600/5 text-brand-600 border-brand-200/50",
    red: "from-state-error/10 to-state-error/5 text-state-error border-state-error/20",
    purple: "from-violet-500/10 to-violet-600/5 text-violet-600 border-violet-200/50",
    orange: "from-state-warning/10 to-state-warning/5 text-state-warning border-state-warning/20",
  };

  return (
    <div className={`
      relative overflow-hidden rounded-2xl border bg-white p-5 
      shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1
      dark:bg-surface-900/50 dark:border-surface-800
    `}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-content-secondary capitalize">
            {title}
          </p>
          <h3 className="mt-2 text-2xl font-bold text-content-primary">
            {value}
          </h3>
          
          {trend && (
            <div className={`mt-2 flex items-center gap-1 text-xs font-medium ${
              trend.isUp ? "text-state-success" : "text-state-error"
            }`}>
              <span>{trend.isUp ? "↑" : "↓"}</span>
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-content-tertiary">vs ayer</span>
            </div>
          )}
        </div>
        
        <div className={`
          flex h-12 w-12 items-center justify-center rounded-xl border bg-linear-to-br
          ${colorClasses[color]}
        `}>
          {icon}
        </div>
      </div>
      
      {/* Background patterns */}
      <div className="absolute -right-6 -bottom-6 h-24 w-24 rounded-full opacity-5 bg-current" />
    </div>
  );
}
