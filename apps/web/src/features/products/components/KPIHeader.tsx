import { Package, Folder, Scale, Shirt } from "lucide-react";
import type { Category, Product } from "../types/products.types";

interface KPIHeaderProps {
  products: Product[];
  categories: Category[];
}

export function KPIHeader({ products, categories }: KPIHeaderProps) {
  const activeProducts = products.filter(p => !p.deletedAt);
  const activeCategories = categories.filter(c => !c.deletedAt);
  const taxableProducts = activeProducts.filter(p => p.isTaxable);
  const seedProducts = activeProducts.filter(p => !p.preferredSupplierLocalId);

  const kpis = [
    { label: "Total SKUs", value: activeProducts.length, icon: Package },
    { label: "Categorías Activas", value: activeCategories.length, icon: Folder },
    { label: "Gravables (IVA 16%)", value: taxableProducts.length, icon: Scale },
    { label: "Global (Seed)", value: seedProducts.length, icon: Shirt }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-content-tertiary">
              <kpi.icon className="w-4 h-4" />
            </span>
          </div>
          <div className="stat-value">{kpi.value.toLocaleString("es-VE")}</div>
          <div className="stat-label">{kpi.label}</div>
        </div>
      ))}
    </div>
  );
}
