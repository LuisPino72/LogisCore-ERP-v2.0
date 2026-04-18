import { useState } from "react";
import * as Sentry from "@sentry/react";
import { AppLayout, type ModuleId } from "@/common/components/AppLayout";
import { ModuleRenderer } from "@/common/components/ModuleRenderer";
import { TenantBootstrapGate } from "@/features/tenant/components/TenantBootstrapGate";
import { authService } from "@/features/auth/services/auth.service.instance";
import { tenantService } from "@/features/tenant/services/tenant.service.instance";
import { syncEngine } from "@/lib/core/runtime";
import { type TenantContext } from "@/features/tenant/types/tenant.types";

/**
 * LogisCore ERP
 */
export function App() {
  const [activeModule, setActiveModule] = useState<ModuleId>("dashboard");

  const coreService = {
    startSync: () => syncEngine.startPeriodicSync(),
    bootstrapSession: async () => {}
  };

  return (
    <Sentry.ErrorBoundary fallback={<div className="p-4 text-red-500">Ha ocurrido un error inesperado. El equipo técnico ha sido notificado.</div>}>
      <TenantBootstrapGate
        authService={authService}
        tenantService={tenantService}
        coreService={coreService}
        renderApp={(tenantSlug, actor, onLogout, tenant) => {
          // En LogisCore, el bootstrap asegura que si llegamos aquí, tenemos el contexto necesario.
          // Si estamos en modo suplantación (admin), el tenantContext puede venir del servicio de admin o ser el base.
          const context: TenantContext = tenant || {
            tenantSlug,
            tenantUuid: "", 
            userId: actor.role 
          };

          return (
            <AppLayout 
              activeModule={activeModule} 
              onModuleChange={setActiveModule}
              onLogout={onLogout}
              features={context.features || {}}
            >
              <ModuleRenderer 
                activeModule={activeModule} 
                tenant={{ ...context, tenantSlug }}
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
