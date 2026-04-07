import type { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: number;
    isUp: boolean;
  } | undefined;
  color?: "blue" | "green" | "red" | "purple" | "orange" | "gold";
  tooltip?: string;
}

export function StatCard({ title, value, icon, trend, color = "gold", tooltip }: StatCardProps) {
  const colorClasses = {
    gold: "from-brand-50 to-brand-100 text-brand-700 border-brand-200",
    blue: "from-blue-50 to-blue-100 text-blue-700 border-blue-200",
    green: "from-emerald-50 to-emerald-100 text-emerald-700 border-emerald-200",
    red: "from-red-50 to-red-100 text-red-700 border-red-200",
    purple: "from-violet-50 to-violet-100 text-violet-700 border-violet-200",
    orange: "from-amber-50 to-amber-100 text-amber-700 border-amber-200",
  };

  return (
    <div className={`
      relative overflow-hidden rounded-xl border bg-white p-5 
      shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1
      ${color === "gold" ? "hover:border-brand-300" : ""}
    `} title={tooltip}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-content-tertiary">
            {title}
          </p>
          <h3 className="text-3xl font-bold text-content-primary tracking-tight">
            {value}
          </h3>
          
          {trend && (
            <div className={`flex items-center gap-1 text-xs font-semibold ${
              trend.isUp ? "text-state-success" : "text-state-error"
            }`}>
              <span>{trend.isUp ? "↑" : "↓"}</span>
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-content-tertiary">vs ayer</span>
            </div>
          )}
        </div>
        
        <div className={`
          flex h-14 w-14 items-center justify-center rounded-lg border bg-linear-to-br font-xl
          ${colorClasses[color]}
        `}>
          {icon}
        </div>
      </div>
      
      {color === "gold" && (
        <div className="absolute -right-8 -bottom-8 h-28 w-28 rounded-full bg-brand-400/10 blur-2xl" />
      )}
    </div>
  );
}
