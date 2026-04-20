/**
 * Layout principal del Admin Panel.
 * Contenedor que incluye el sidebar de navegación y el área de contenido.
 * 
 * Props:
 * - activeModule: Módulo actualmente seleccionado
 * - onModuleChange: Callback al cambiar de módulo
 * - children: Contenido principal a renderizar
 * - onLogout: Función para cerrar sesión
 * - userEmail: Email del usuario actual
 */

import { useState } from "react";
import type { AdminModule } from "../types/admin.types";
import { AdminSidebar } from "./AdminSidebar";
import { Button } from "@/common/components/Button";

interface AdminLayoutProps {
  activeModule: AdminModule;
  onModuleChange: (module: AdminModule) => void;
  children: React.ReactNode;
  onLogout: () => void;
  userEmail: string;
}

export function AdminLayout({ activeModule, onModuleChange, children, onLogout, userEmail }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-surface-50">
      <AdminSidebar 
        activeModule={activeModule} 
        onModuleChange={onModuleChange}
        onLogout={onLogout}
        userEmail={userEmail}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <main className={`flex-1 p-4 md:p-6 transition-all duration-300 ${sidebarOpen ? "ml-0 md:ml-64" : "ml-0 md:ml-64"}`}>
        <Button 
          onClick={() => setSidebarOpen(true)}
          className="md:hidden fixed top-4 left-4 z-50 p-2 bg-surface-900 text-white rounded-lg shadow-lg"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </Button>
        {children}
      </main>
    </div>
  );
}

/**
 * Componente de layout que envuelve todo el panel administrativo.
 * Proporciona estructura con sidebar fijo y contenido desplazable.
 */
