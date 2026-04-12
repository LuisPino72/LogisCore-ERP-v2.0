import { useEffect, useRef, useState } from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from "recharts";
import type { TopProductMetric } from "../types/dashboard.types";

interface TopProductsChartProps {
  data: TopProductMetric[];
}

export function TopProductsChart({ data }: TopProductsChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [mounted, setMounted] = useState(false);
  const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];

  useEffect(() => {
    setMounted(true);
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };
    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  if (!mounted || !data?.length || dimensions.width <= 0 || dimensions.height <= 0) {
    return (
      <div className="h-[300px] w-full bg-white p-6 rounded-2xl border shadow-sm flex items-center justify-center">
        <p className="text-content-tertiary">{data?.length ? "Cargando gráfico..." : "No hay productos vendidos"}</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full min-h-[300px] w-full bg-white p-6 rounded-xl border border-surface-200 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-content-primary">
          Productos más vendidos
        </h3>
        <span className="text-xs font-medium text-content-tertiary uppercase tracking-widest">
          Top 5
        </span>
      </div>
      
      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
            <XAxis type="number" hide />
            <YAxis 
              dataKey="name" 
              type="category" 
              axisLine={false} 
              tickLine={false} 
              width={100}
              tick={{ fontSize: 12, fill: "#64748b", fontWeight: 500 }}
            />
            <Tooltip 
               contentStyle={{ 
                borderRadius: "12px", 
                border: "none", 
                boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                padding: "12px"
              }}
              formatter={(value) => [`${value} unidades`, "Cantidad"]}
            />
            <Bar dataKey="qty" radius={[0, 8, 8, 0]} barSize={24}>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length] as string} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}