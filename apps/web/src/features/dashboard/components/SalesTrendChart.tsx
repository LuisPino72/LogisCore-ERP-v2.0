import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import type { SalesTrendPoint } from "../types/dashboard.types";

interface SalesTrendChartProps {
  data: SalesTrendPoint[];
  currencySymbol: string;
}

export function SalesTrendChart({ data, currencySymbol }: SalesTrendChartProps) {
  return (
    <div className="h-full min-h-[300px] w-full bg-white dark:bg-slate-900/50 p-6 rounded-2xl border dark:border-slate-800 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          Tendencia de Ventas
        </h3>
        <span className="text-xs font-medium text-slate-500 uppercase tracking-widest">
          Últimos 7 días
        </span>
      </div>
      
      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: "#64748b" }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: "#64748b" }}
            />
            <Tooltip 
              contentStyle={{ 
                borderRadius: "12px", 
                border: "none", 
                boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                padding: "12px"
              }}
              formatter={(value: number) => [`${currencySymbol} ${value.toFixed(2)}`, "Ingreso"]}
              labelStyle={{ fontSize: "14px", fontWeight: "bold", marginBottom: "4px" }}
            />
            <Area 
              type="monotone" 
              dataKey="amount" 
              stroke="#3b82f6" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorAmount)" 
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
