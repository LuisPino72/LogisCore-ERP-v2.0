import { formatDistanceToNow, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { RecentActivityEntry } from "../types/dashboard.types";

interface RecentActivityListProps {
  activities: RecentActivityEntry[];
  currencySymbol: string;
}

export function RecentActivityList({ activities, currencySymbol }: RecentActivityListProps) {
  const ICON_MAP = {
    sale: (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
        🛒
      </div>
    ),
    inventory: (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
        📦
      </div>
    ),
    system: (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
        ⚙️
      </div>
    ),
  };

  return (
    <div className="bg-white dark:bg-slate-900/50 p-6 rounded-2xl border dark:border-slate-800 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          Actividad Reciente
        </h3>
        <button className="text-xs font-semibold text-blue-600 hover:text-blue-700 uppercase tracking-tighter">
          Ver todo
        </button>
      </div>
      
      <div className="space-y-6 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-px before:bg-slate-100 dark:before:bg-slate-800">
        {activities.map((activity) => (
          <div key={activity.id} className="relative pl-10">
            <div className="absolute left-0 top-0 z-10">
              {ICON_MAP[activity.type]}
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 group">
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                  {activity.title}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {activity.description}
                </p>
              </div>
              
              <div className="text-right">
                {activity.amount !== undefined && (
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {currencySymbol} {activity.amount.toFixed(2)}
                  </p>
                )}
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap">
                  {formatDistanceToNow(parseISO(activity.timestamp), { 
                    addSuffix: true, 
                    locale: es 
                  })}
                </p>
              </div>
            </div>
          </div>
        ))}
        
        {activities.length === 0 && (
          <div className="py-10 text-center">
            <p className="text-sm text-slate-400 italic">No hay actividad registrada</p>
          </div>
        )}
      </div>
    </div>
  );
}
