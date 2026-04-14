import type { ReactNode } from "react";
import { Tooltip } from "@/common";

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
  const colorClasses: Record<string, string> = {
    gold: "from-brand-50 to-brand-100 text-brand-700 border-brand-200",
    blue: "from-state-info/10 to-state-info/5 text-state-info border-state-info/20",
    green: "from-state-success/10 to-state-success/5 text-state-success border-state-success/20",
    red: "from-state-error/10 to-state-error/5 text-state-error border-state-error/20",
    purple: "from-violet-50 to-violet-100 text-violet-700 border-violet-200",
    orange: "from-state-warning/10 to-state-warning/5 text-state-warning border-state-warning/20",
  };

  return (
    <div className={`
      relative overflow-hidden rounded-xl border bg-white p-5 
      shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1
      ${color === "gold" ? "hover:border-brand-300" : ""}
    `}>
      {tooltip ? (
        <Tooltip content={tooltip} position="top">
          <div className="flex items-center justify-between cursor-help">
            <div className="flex flex-col items-start min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-content-tertiary">
                {title}
              </p>
              <h3 className="text-2xl sm:text-3xl font-bold text-content-primary tracking-tight truncate max-w-full">
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
              flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-lg border shrink-0
              ${colorClasses[color]}
            `}>
              {icon}
            </div>
          </div>
        </Tooltip>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex flex-col items-start min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-content-tertiary">
              {title}
            </p>
            <h3 className="text-2xl sm:text-3xl font-bold text-content-primary tracking-tight truncate max-w-full">
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
            flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-lg border shrink-0
            ${colorClasses[color]}
          `}>
            {icon}
          </div>
        </div>
      )}
    </div>
  );
}
