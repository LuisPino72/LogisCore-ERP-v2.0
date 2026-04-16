import { useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";

export type ModuleId = "dashboard" | "inventory" | "products" | "purchases" | "sales" | "production" | "invoicing" | "reports";

interface AppLayoutProps {
  children: ReactNode;
  activeModule: ModuleId;
  onModuleChange: (module: ModuleId) => void;
  onLogout?: () => void;
  features?: Record<string, boolean>;
}

const baseModules = [
  { id: "dashboard" as const, label: "Dashboard", icon: null },
  { id: "inventory" as const, label: "Inventario", icon: null },
  { id: "products" as const, label: "Productos", icon: null },
  { id: "purchases" as const, label: "Compras", icon: null },
  { id: "sales" as const, label: "Ventas", icon: null },
  { id: "invoicing" as const, label: "Facturación", icon: null },
  { id: "reports" as const, label: "Reportes", icon: null }
];

const proModules = [
  { id: "production" as const, label: "Producción", icon: null }
];

export function AppLayout({ children, activeModule, onModuleChange, onLogout, features = {} }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  const hasProductionAccess = features.production === true;
  const modules = hasProductionAccess 
    ? [...baseModules.slice(0, 5), ...proModules, ...baseModules.slice(5)]
    : baseModules;

  return (
    <div className="flex h-screen bg-surface-50">
      <Sidebar
        items={modules}
        activeItem={activeModule}
        onItemClick={(id) => onModuleChange(id as ModuleId)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        onLogout={onLogout}
      />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
