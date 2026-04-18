import { useState } from "react";
import { AppLayout, type ModuleId } from "@/common/components/AppLayout";
import { ModuleRenderer } from "@/common/components/ModuleRenderer";
import { TenantBootstrapGate } from "@/features/tenant/components/TenantBootstrapGate";
import { authService } from "@/features/auth/services/auth.service.instance";
import { tenantService } from "@/features/tenant/services/tenant.service.instance";
import { syncEngine } from "@/lib/core/runtime";
import { type ActorContext } from "@/lib/permissions/permissions.types";

/**
 * LogisCore ERP - Punto de entrada (v6.8)
 * Implementa arquitectura modular descompuesta (ARCH-001)
 */
export function App() {
  const [activeModule, setActiveModule] = useState<ModuleId>("dashboard");

  // coreService adapter for the gate
  const coreService = {
    startSync: () => syncEngine.startPeriodicSync(),
    bootstrapSession: async () => { /* Session already handled by gate, but can add pre-fetching here */ }
  };

  return (
    <TenantBootstrapGate
      authService={authService}
      tenantService={tenantService}
      coreService={coreService}
      renderApp={(tenantSlug, actor, onLogout, tenant) => (
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
      )}
    />
  );
}
