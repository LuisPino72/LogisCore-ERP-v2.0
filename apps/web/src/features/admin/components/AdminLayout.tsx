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

import type { AdminModule } from "../types/admin.types";
import { AdminSidebar } from "./AdminSidebar";

interface AdminLayoutProps {
  activeModule: AdminModule;
  onModuleChange: (module: AdminModule) => void;
  children: React.ReactNode;
  onLogout: () => void;
  userEmail: string;
}

/**
 * Componente de layout que envuelve todo el panel administrativo.
 * Proporciona estructura con sidebar fijo y contenido desplazable.
 */
export function AdminLayout({ activeModule, onModuleChange, children, onLogout, userEmail }: AdminLayoutProps) {
  return (
    <div className="flex min-h-screen bg-surface-50">
      <AdminSidebar 
        activeModule={activeModule} 
        onModuleChange={onModuleChange}
        onLogout={onLogout}
        userEmail={userEmail}
      />
      <main className="flex-1 ml-64 p-6">
        {children}
      </main>
    </div>
  );
}
