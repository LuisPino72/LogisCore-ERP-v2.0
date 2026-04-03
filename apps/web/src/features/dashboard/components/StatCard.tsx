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
    blue: "from-blue-500/10 to-blue-600/5 text-blue-600 border-blue-200/50",
    green: "from-emerald-500/10 to-emerald-600/5 text-emerald-600 border-emerald-200/50",
    red: "from-rose-500/10 to-rose-600/5 text-rose-600 border-rose-200/50",
    purple: "from-violet-500/10 to-violet-600/5 text-violet-600 border-violet-200/50",
    orange: "from-amber-500/10 to-amber-600/5 text-amber-600 border-amber-200/50",
  };

  return (
    <div className={`
      relative overflow-hidden rounded-2xl border bg-white p-5 
      shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1
      dark:bg-slate-900/50 dark:border-slate-800
    `}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 capitalize">
            {title}
          </p>
          <h3 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {value}
          </h3>
          
          {trend && (
            <div className={`mt-2 flex items-center gap-1 text-xs font-medium ${
              trend.isUp ? "text-emerald-600" : "text-rose-600"
            }`}>
              <span>{trend.isUp ? "↑" : "↓"}</span>
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-slate-400">vs ayer</span>
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
