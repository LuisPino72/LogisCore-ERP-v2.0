import { Suspense, lazy } from "react";
import { LoadingSpinner } from "./EmptyState";
import { ErrorBoundary } from "./ErrorBoundary";
import type { ModuleId } from "./AppLayout";

// Lazy loading features
const DashboardPanel = lazy(() => import("@/features/dashboard/components/DashboardPanel").then(m => ({ default: m.DashboardPanel })));
const ProductsCatalog = lazy(() => import("@/features/products/components/ProductsCatalog").then(m => ({ default: m.ProductsCatalog })));
const SalesPanel = lazy(() => import("@/features/sales/components/SalesPanel").then(m => ({ default: m.SalesPanel })));
const InventoryPanel = lazy(() => import("@/features/inventory/components/InventoryPanel").then(m => ({ default: m.InventoryPanel })));
const PurchasesPanel = lazy(() => import("@/features/purchases/components/PurchasesPanel").then(m => ({ default: m.PurchasesPanel })));
const InvoicingPanel = lazy(() => import("@/features/invoicing/components/InvoicingPanel").then(m => ({ default: m.InvoicingPanel })));
const ReportsPanel = lazy(() => import("@/features/reports/components/ReportsPanel").then(m => ({ default: m.ReportsPanel })));
const ProductionPanel = lazy(() => import("@/features/production/components/ProductionPanel").then(m => ({ default: m.ProductionPanel })));

interface ModuleRendererProps {
  activeModule: ModuleId;
  tenant: any;
  actor: any;
  onNavigate: (module: ModuleId) => void;
}

/**
 * Orquestador de renderizado de módulos (v6.7)
 * Implementa la descomposición del antiguo "God Component" App.tsx
 */
export function ModuleRenderer({ activeModule, tenant, actor, onNavigate }: ModuleRendererProps) {
  // Shared data/services requirement
  const tenantSlug = tenant.tenantSlug;
  const businessTypeId = tenant.businessTypeId;

  return (
    <ErrorBoundary key={activeModule}>
      <Suspense fallback={<LoadingSpinner variant="fullscreen" message={`Iniciando módulo ${activeModule}...`} />}>
        {activeModule === "dashboard" && (
          <DashboardPanel 
            tenant={tenant} 
            actor={actor} 
            onNavigate={onNavigate} 
          />
        )}
        
        {activeModule === "products" && (
          <ProductsCatalog 
            tenantSlug={tenantSlug} 
            actor={actor} 
            businessTypeId={businessTypeId}
          />
        )}
        
        {activeModule === "sales" && (
          <SalesPanel 
            tenantSlug={tenantSlug} 
            actor={actor} 
            products={[]} // El panel de ventas ahora gestiona internamente su búsqueda de productos o requiere inyección
          />
        )}

        {activeModule === "inventory" && (
          <InventoryPanel 
            tenantSlug={tenantSlug} 
            actor={actor} 
            products={[]}
          />
        )}

        {activeModule === "purchases" && (
          <PurchasesPanel 
            tenantSlug={tenantSlug} 
            actor={actor} 
            products={[]}
          />
        )}

        {activeModule === "invoicing" && (
          <InvoicingPanel 
            tenantSlug={tenantSlug} 
            actor={actor} 
            features={tenant.features}
          />
        )}

        {activeModule === "reports" && (
          <ReportsPanel 
            tenantSlug={tenantSlug} 
            actor={actor} 
          />
        )}

        {activeModule === "production" && (
          <ProductionPanel 
            tenantSlug={tenantSlug} 
            actor={actor} 
            products={[]}
            features={tenant.features}
          />
        )}
        
        {/* Fallback para módulos no implementados o roles sin acceso */}
        {!["dashboard", "products", "sales", "inventory", "purchases", "invoicing", "reports", "production"].includes(activeModule) && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-12">
            <div className="w-20 h-20 mb-6 bg-surface-100 rounded-full flex items-center justify-center text-content-tertiary">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-content-primary mb-2">
              Módulo "{activeModule}" en Mantenimiento
            </h2>
            <p className="text-content-secondary max-w-md">
              Estamos migrando este componente a la arquitectura modular v6.7. 
              Por favor, contacta a soporte si necesitas acceso urgente.
            </p>
          </div>
        )}
      </Suspense>
    </ErrorBoundary>
  );
}
