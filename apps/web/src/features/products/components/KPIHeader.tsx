import { Package, Folder, Scale, Globe } from "lucide-react";
import type { Category, Product } from "../types/products.types";
import { Tooltip } from "@/common";
import { StatCard } from "@/common/components/StatCard";

interface KPIHeaderProps {
  products: Product[];
  categories: Category[];
  globalProductsCount?: number;
}

export function KPIHeader({ products, categories, globalProductsCount }: KPIHeaderProps) {
  const activeProducts = products.filter(p => !p.deletedAt);
  const activeCategories = categories.filter(c => !c.deletedAt);
  const taxableProducts = activeProducts.filter(p => p.isTaxable);

  const kpis = [
    { label: "Total SKUs", value: activeProducts.length, icon: Package, tooltip: "Total de productos activos en el catálogo" },
    { label: "Categorías Activas", value: activeCategories.length, icon: Folder, tooltip: "Categorías de productos disponibles" },
    { label: "Gravables (IVA 16%)", value: taxableProducts.length, icon: Scale, tooltip: "Productos que aplicarán IVA en ventas" },
    { label: "Catálogo Global", value: globalProductsCount ?? 0, icon: Globe, tooltip: "Productos disponibles en el catálogo global para importar" }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {kpis.map((kpi) => (
        <Tooltip key={kpi.label} content={kpi.tooltip} position="top">
          <StatCard 
            label={kpi.label}
            value={kpi.value.toLocaleString("es-VE")}
            icon={<kpi.icon className="w-5 h-5 text-brand-600" />}
            className="cursor-help hover:bg-surface-50 transition-colors"
          />
        </Tooltip>
      ))}
    </div>
  );
}
