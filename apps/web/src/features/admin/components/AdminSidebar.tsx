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

interface AdminSidebarProps {
  activeModule: AdminModule;
  onModuleChange: (module: AdminModule) => void;
  onLogout: () => void;
  userEmail: string;
}

/** Lista de módulos del admin panel con etiquetas e iconos */
const modules: { id: AdminModule; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { id: "tenants", label: "Tenants", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h-2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-1 4h1m2-4h.01M9 21h1m-1 4h1m-4-4h.01M9 17h.01" },
  { id: "security", label: "Seguridad", icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" },
  { id: "businessTypes", label: "Tipos de Negocio", icon: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" },
  { id: "subscriptions", label: "Suscripciones", icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" },
  { id: "settings", label: "Configuración", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" },
];

export function AdminSidebar({ activeModule, onModuleChange, onLogout, userEmail }: AdminSidebarProps) {
  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-surface-900 text-content-inverse flex flex-col">
      <div className="p-6 border-b border-surface-700">
        <div className="flex items-center gap-3">
          <img src="/Emblema.ico" alt="LogisCore" className="w-10 h-10" />
          <div>
            <h1 className="font-bold text-lg">LogisCore</h1>
            <p className="text-xs text-surface-400">Panel de Administración</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {modules.map(module => (
          <button
            key={module.id}
            onClick={() => onModuleChange(module.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
              activeModule === module.id
                ? "bg-brand-600 text-white"
                : "text-surface-300 hover:bg-surface-800 hover:text-white"
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={module.icon} />
            </svg>
            <span className="font-medium">{module.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-surface-700">
        {userEmail && (
          <p className="text-xs text-surface-400 mb-3 truncate">{userEmail}</p>
        )}
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-surface-400 hover:bg-surface-800 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}
