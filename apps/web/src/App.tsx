import { useState, useMemo } from "react";
import * as Sentry from "@sentry/react";
import { AppLayout, type ModuleId } from "@/common/components/AppLayout";
import { ModuleRenderer } from "@/common/components/ModuleRenderer";
import { TenantBootstrapGate } from "@/features/tenant/components/TenantBootstrapGate";
import { authService } from "@/features/auth/services/auth.service.instance";
import { tenantService } from "@/features/tenant/services/tenant.service.instance";
import { coreService } from "@/features/core/services/core.service.instance";
import { syncEngine } from "@/lib/core/runtime";
import { usePermissions, setGlobalUserRole, setGlobalTenantContext } from "@/lib/permissions/usePermissions";



/**
 * LogisCore ERP
 */
export function App() {
  const [activeModule, setActiveModule] = useState<ModuleId>("dashboard");
  usePermissions();

  const appCoreService = useMemo(() => ({
    startSync: () => syncEngine.startPeriodicSync(),
    bootstrapSession: () => coreService.bootstrapSession()
  }), [syncEngine, coreService]);

  return (
    <Sentry.ErrorBoundary fallback={<div className="p-4 text-red-500">Ha ocurrido un error inesperado. El equipo técnico ha sido notificado.</div>}>
      <TenantBootstrapGate
        authService={authService}
        tenantService={tenantService}
        coreService={appCoreService}
        setGlobalUserRole={setGlobalUserRole}
        setGlobalTenantContext={setGlobalTenantContext}
        renderApp={(tenantSlug, actor, onLogout, tenant) => {
          return (
            <AppLayout 
              activeModule={activeModule} 
              onModuleChange={setActiveModule}
              onLogout={onLogout}
              features={tenant?.features || {}}
            >
              <ModuleRenderer 
                activeModule={activeModule} 
                tenant={{ ...tenant, tenantSlug }}
                actor={actor}
                onNavigate={setActiveModule}
              />
            </AppLayout>
          );
        }}
      />
    </Sentry.ErrorBoundary>
  );
}