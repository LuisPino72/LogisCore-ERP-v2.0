import { formatDistanceToNow, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { RecentActivityEntry } from "../types/dashboard.types";
import { Button } from "@/common/components/Button";

interface RecentActivityListProps {
  activities: RecentActivityEntry[];
  currencySymbol: string;
}

export function RecentActivityList({ activities, currencySymbol }: RecentActivityListProps) {
  const ICON_MAP = {
    sale: (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-state-info/10 text-state-info">
        🛒
      </div>
    ),
    inventory: (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-state-success/10 text-state-success">
        📦
      </div>
    ),
    system: (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-100 text-content-secondary">
        ⚙️
      </div>
    ),
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-surface-200 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-content-primary">
          Actividad Reciente
        </h3>
        <Button variant="ghost" size="sm" className="text-xs font-semibold text-state-info hover:text-brand-600 uppercase tracking-tighter">
          Ver todo
        </Button>
      </div>
      
      <div className="space-y-6 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-px before:bg-surface-200">
        {activities.map((activity) => (
          <div key={activity.id} className="relative pl-10">
            <div className="absolute left-0 top-0 z-10">
              {ICON_MAP[activity.type]}
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 group">
              <div>
                <h4 className="text-sm font-semibold text-content-primary group-hover:text-state-info transition-colors">
                  {activity.title}
                </h4>
                <p className="text-xs text-content-tertiary">
                  {activity.description}
                </p>
              </div>
              
              <div className="text-right">
                {activity.amount !== undefined && (
                  <p className="text-sm font-bold text-content-primary">
                    {currencySymbol} {activity.amount.toFixed(2)}
                  </p>
                )}
                <p className="text-[10px] text-content-tertiary font-medium whitespace-nowrap">
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
            <p className="text-sm text-content-tertiary italic">No hay actividad registrada</p>
          </div>
        )}
      </div>
    </div>
  );
}