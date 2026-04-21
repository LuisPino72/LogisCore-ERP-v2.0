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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const hasProductionAccess = features.production === true;
  const modules = hasProductionAccess 
    ? [...baseModules.slice(0, 5), ...proModules, ...baseModules.slice(5)]
    : baseModules;

  const handleModuleChange = (id: ModuleId) => {
    onModuleChange(id);
    setMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen bg-surface-50">
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 flex items-center gap-3 px-4 py-3 bg-white border-b border-surface-200">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 -ml-2 rounded-lg hover:bg-surface-100"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <img src="/Emblema.ico" alt="LogisCore" className="w-8 h-8 rounded-lg" />
        <span className="font-bold text-content-primary">LogisCore</span>
      </div>
      
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      
      <Sidebar
        items={modules}
        activeItem={activeModule}
        onItemClick={handleModuleChange}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        onLogout={onLogout}
      />
      
      <main className="flex-1 overflow-auto pt-14 lg:pt-0">
        {children}
      </main>
    </div>
  );
}
