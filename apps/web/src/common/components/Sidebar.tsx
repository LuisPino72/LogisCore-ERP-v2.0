import { memo, type ReactNode } from "react";

export interface SidebarItem {
  id: string;
  label: string;
  icon?: ReactNode;
}

export interface SidebarProps {
  items: { id: string; label: string; icon?: ReactNode }[];
  activeItem: string;
  onItemClick: (id: string) => void;
  collapsed?: boolean | undefined;
  onToggleCollapse?: (() => void) | undefined;
  onLogout?: (() => void) | undefined;
}

const iconPaths: Record<string, string> = {
  dashboard: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  inventory: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
  products: "M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4",
  purchases: "M3 3h2m.2 16.2l2.2 2.2m2.2-12.4l2.2 2.2 7.2 7.2m-7.2-2.4l2.2 2.2M7 21h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v12a2 2 0 002 2z",
  sales: "M3 10h18M3 14h18m-9-4v8m-4 0h8m-4 0a2 2 0 110-4 2 2 0 010 4zm0 0a2 2 0 110 4 2 2 0 010-4z",
  production: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z",
  invoicing: "M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z",
  reports: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  settings: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  logout: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
};

export const Sidebar = memo(function Sidebar({ items, activeItem, onItemClick, collapsed = false, onToggleCollapse, onLogout }: SidebarProps) {
  return (
    <aside
      className={`flex flex-col bg-white border-r border-surface-200 transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      <div className="flex items-center justify-between p-4 border-b border-surface-200">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <img src="/Emblema.ico" alt="LogisCore" className="w-8 h-8 rounded-lg" />
            <span className="font-bold text-content-primary">LogisCore</span>
          </div>
        )}
        {collapsed && (
          <img src="/Emblema.ico" alt="LogisCore" className="w-8 h-8 rounded-lg mx-auto" />
        )}
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {items.map((item) => {
          const isActive = item.id === activeItem;
          return (
            <button
              key={item.id}
              onClick={() => onItemClick(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive
                  ? "bg-brand-50 text-brand-700"
                  : "text-content-secondary hover:bg-surface-100 hover:text-content-primary"
              }`}
              title={collapsed ? item.label : undefined}
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPaths[item.id] || iconPaths.dashboard} />
              </svg>
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="p-2 space-y-1 border-t border-surface-200">
        {onLogout && (
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-content-secondary hover:bg-error-50 hover:text-error-600 transition-colors"
            title={collapsed ? "Cerrar sesión" : undefined}
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPaths.logout} />
            </svg>
            {!collapsed && <span className="text-sm font-medium">Cerrar sesión</span>}
          </button>
        )}
        
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-content-secondary hover:bg-surface-100 hover:text-content-primary transition-colors"
            title={collapsed ? "Expandir" : "Contraer"}
          >
            <svg className={`w-5 h-5 transition-transform ${collapsed ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
            {!collapsed && <span className="text-sm font-medium">Contraer barra</span>}
          </button>
        )}
      </div>
    </aside>
  );
});
