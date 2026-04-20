/**
 * Sidebar del Admin Panel.
 * Barra de navegación lateral fija con acceso a todos los módulos administrativos.
 *
 * Módulos disponibles:
 * - Dashboard: Estadísticas globales
 * - Tenants: Gestión de empresas
 * - Seguridad: Gestión de usuarios
 * - Tipos de Negocio: Categorías de negocio
 * - Suscripciones: Planes y suscripciones
 * - Configuración: Configuración global
 */

import type { AdminModule } from "../types/admin.types";
import { Button } from "@/common/components/Button";

interface AdminSidebarProps {
  activeModule: AdminModule;
  onModuleChange: (module: AdminModule) => void;
  onLogout: () => void;
  userEmail: string;
  isOpen?: boolean;
  onClose?: () => void;
}

/** Lista de módulos del admin panel con etiquetas e iconos */
const modules: { id: AdminModule; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { id: "metrics", label: "Métricas", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { id: "tenants", label: "Tenants", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h-2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-1 4h1m2-4h.01M9 21h1m-1 4h1m4-4h.01M9 17h.01M9 21h1m-1 4h1m4-4h.01M9 17h1m-1 4h1m4-4h.01M9 17h.01M9 17h.01" },
  { id: "security", label: "Seguridad", icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" },
  { id: "businessTypes", label: "Tipos de Negocio", icon: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" },
  { id: "subscriptions", label: "Suscripciones", icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" },
  { id: "globalCatalog", label: "Catálogos Globales", icon: "M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" },
  { id: "settings", label: "Configuración", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" },
];

export function AdminSidebar({ activeModule, onModuleChange, onLogout, userEmail, isOpen = true, onClose }: AdminSidebarProps) {
  const handleModuleClick = (module: AdminModule) => {
    onModuleChange(module);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Overlay para móvil */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}
      
      <aside className={`fixed left-0 top-0 h-full w-64 bg-surface-900 text-content-inverse flex flex-col z-50 transform transition-transform duration-300 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      } md:translate-x-0`}>
        <div className="p-4 md:p-6 border-b border-surface-700">
          <div className="flex items-center gap-3">
            <img src="/Emblema.ico" alt="LogisCore" className="w-8 h-8 md:w-10 md:h-10" />
            <div>
              <h1 className="font-bold text-lg">LogisCore</h1>
              <p className="text-xs text-surface-400 hidden md:block">Panel de Administración</p>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              className="md:hidden ml-auto"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
        </div>

        <nav className="flex-1 p-2 md:p-4 space-y-1 overflow-y-auto">
          {modules.map(module => (
            <Button
              key={module.id}
              onClick={() => handleModuleClick(module.id)}
              variant={activeModule === module.id ? "primary" : "ghost"}
              className="w-full justify-start"
            >
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={module.icon} />
              </svg>
              <span className="font-medium truncate">{module.label}</span>
            </Button>
          ))}
        </nav>

        <div className="p-2 md:p-4 border-t border-surface-700">
          {userEmail && (
            <p className="text-xs text-surface-400 mb-2 md:mb-3 truncate px-2">{userEmail}</p>
          )}
          <Button
            onClick={onLogout}
            variant="ghost"
            className="w-full justify-start"
          >
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="truncate">Cerrar Sesión</span>
          </Button>
        </div>
      </aside>
    </>
  );
}
