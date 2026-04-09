// Tenant - Gestiona la carga inicial y autenticación del tenant
import { useEffect, useState, useCallback, type ReactNode } from "react";
import { AuthSessionCard, LoginPage } from "@/features/auth/components/Login";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { BlockedAccessScreen } from "@/features/core/components/BlockedAccessScreen";
import { useTenantData } from "../hooks/useTenantData";
import { adminService } from "@/features/admin/services/admin.service.instance";
import { useAdmin } from "@/features/admin/hooks/useAdmin";
import { AdminLayout, Dashboard, TenantsList, SecurityPanel, BusinessTypesPanel, SubscriptionsPanel, SettingsPanel } from "@/features/admin";
import { LoadingSpinner } from "@/common";
import { type AdminModule, type Tenant } from "@/features/admin/types/admin.types";
import { type ActorContext, type ActorPermissions } from "@/lib/permissions/permissions.types";
import { eventBus } from "@/lib/core/runtime";

export function SubscriptionExpirationBanner() {
  return (
    <div className="bg-state-warning text-white p-3 text-center font-bold sticky top-0 z-100 shadow-md animate-pulse">
      ⚠️ ¡Último día de servicio! Por favor comuníquese con <span className="underline">04145180265</span> para renovar su suscripción.
    </div>
  );
}

export interface TenantBootstrapGateProps {
  authService: Parameters<typeof useAuth>[0]["service"];
  tenantService: Parameters<typeof useTenantData>[0]["tenant"];
  coreService: { startSync: () => unknown; bootstrapSession: () => Promise<unknown> };
  renderApp?: (tenantSlug: string, actor: ActorContext, signOut: () => void) => ReactNode;
}

export function TenantBootstrapGate({
  authService,
  tenantService,
  coreService,
  renderApp
}: TenantBootstrapGateProps) {
  const { state: authState, loadSession, signIn, resetPassword, signOut } = useAuth({ service: authService });
  const { state, bootstrapTenantData } = useTenantData({
    auth: authService,
    tenant: tenantService
  });
  const admin = useAdmin({ service: adminService });
  const [activeAdminModule, setActiveAdminModule] = useState<AdminModule>("dashboard");
  const [impersonatedTenantSlug, setImpersonatedTenantSlug] = useState<string | null>(null);

  // Funciones de refresco estables para evitar bucles infinitos
  const refreshSecurity = useCallback(() => {
    admin.loadSecurityUsers();
    admin.loadTenants();
  }, [admin]);

  useEffect(() => {
    void (async () => {
      await loadSession();
    })();
  }, [loadSession]);

  useEffect(() => {
    if (!authState.session) {
      return;
    }
    void (async () => {
      await bootstrapTenantData();
      coreService.startSync();
      await coreService.bootstrapSession();
    })();
  }, [authState.session, bootstrapTenantData, coreService]);

  const handleLogin = async (email: string, password: string) => {
    await signIn(email, password);
  };

  const handleResetPassword = async (email: string) => {
    return await resetPassword(email);
  };

  const handleLogout = async () => {
    setImpersonatedTenantSlug(null);
    await signOut();
  };

  const handleAccessTenant = (tenant: Tenant) => {
    setImpersonatedTenantSlug(tenant.slug);
  };

  // Mostrar estado de verificación mientras carga la sesión
  const isVerifyingSession = authState.isLoading && !authState.session;

  if (isVerifyingSession) {
    return <LoadingSpinner variant="fullscreen" message="Verificando sesión..." />;
  }

  if (!authState.session) {
    const loginError = authState.lastError?.code === "AUTH_SESSION_MISSING" ? null : authState.lastError;
    return (
      <LoginPage
        onLogin={handleLogin}
        onResetPassword={handleResetPassword}
        isLoading={authState.isLoading}
        error={loginError}
      />
    );
  }

  if (authState.isLoading || state.isLoading) {
    return <LoadingSpinner variant="fullscreen" message="Cargando sesión..." />;
  }

  if (state.lastError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-surface-50">
        <div className="card max-w-md w-full p-8 text-center">
          <div className="alert alert-error mb-6">
            <span>{state.lastError.message}</span>
          </div>
          <button onClick={() => window.location.reload()} className="btn btn-primary w-full">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (state.isBlocked) {
    return <BlockedAccessScreen tenantName={state.tenant?.name ?? "N/A"} eventBus={eventBus} onLogout={signOut} />;
  }

  if (state.userRole?.role === "admin" && !impersonatedTenantSlug) {
    return (
      <AdminLayout
        activeModule={activeAdminModule}
        onModuleChange={setActiveAdminModule}
        onLogout={handleLogout}
        userEmail={authState.session.email || "admin@logiscoredev.com"}
      >
        {activeAdminModule === "dashboard" && (
          <Dashboard
            stats={admin.stats}
            isLoading={admin.state.isLoading}
            onRefresh={admin.loadStats}
          />
        )}
        {activeAdminModule === "tenants" && (
          <TenantsList
            tenants={admin.tenants}
            businessTypes={admin.businessTypes}
            plans={admin.plans}
            securityUsers={admin.securityUsers}
            isLoading={admin.state.isLoading}
            onRefresh={admin.loadTenants}
            onCreate={admin.createTenant}
            onUpdate={admin.updateTenant}
            onDeactivate={admin.deactivateTenant}
            onDelete={admin.deleteTenant}
            onAccessTenant={handleAccessTenant}
            onLoadBusinessTypes={admin.loadBusinessTypes}
            onLoadSecurityUsers={admin.loadSecurityUsers}
            onLoadPlans={admin.loadPlans}
          />
        )}
        {activeAdminModule === "security" && (
          <SecurityPanel
            users={admin.securityUsers}
            isLoading={admin.state.isLoading}
            onRefresh={refreshSecurity}
            onToggleUser={admin.toggleUserStatus}
            auditLogs={admin.auditLogs}
            auditLogsTotal={admin.auditLogsTotal}
            onLoadAuditLogs={admin.loadAuditLogs}
          />
        )}
        {activeAdminModule === "businessTypes" && (
          <BusinessTypesPanel
            businessTypes={admin.businessTypes}
            isLoading={admin.state.isLoading}
            onRefresh={admin.loadBusinessTypes}
            onCreate={admin.createBusinessType}
            onUpdate={admin.updateBusinessType}
            onDelete={admin.deleteBusinessType}
          />
        )}
        {activeAdminModule === "subscriptions" && (
          <SubscriptionsPanel
            subscriptions={admin.subscriptions}
            plans={admin.plans}
            isLoading={admin.state.isLoading}
            onRefreshSubscriptions={admin.loadSubscriptions}
            onRefreshPlans={admin.loadPlans}
            onRefreshTenants={admin.loadTenants}
            onRenewSubscription={admin.renewSubscriptionWithPlan}
          />
        )}
        {activeAdminModule === "settings" && (
          <SettingsPanel
            config={admin.globalConfig}
            isLoading={admin.state.isLoading}
            onRefresh={admin.loadGlobalConfig}
            onUpdate={admin.updateGlobalConfig}
          />
        )}
      </AdminLayout>
    );
  }

  if (renderApp && (state.tenant?.tenantSlug || impersonatedTenantSlug)) {
    const slug = impersonatedTenantSlug || state.tenant?.tenantSlug;
    const defaultPermissions: ActorPermissions = {
      canApplyDiscount: false,
      maxDiscountPercent: 0,
      canApplyCustomPrice: false,
      canVoidSale: false,
      canRefundSale: false,
      canVoidInvoice: false,
      canAdjustStock: false,
      canViewReports: true,
      canExportReports: false
    };

    return (
      <div className="relative">
        {impersonatedTenantSlug && state.userRole?.role === "admin" && (
          <div className="bg-brand-600 text-white p-2 text-center text-sm font-medium flex items-center justify-center gap-4">
            Viewing as admin: <span className="font-bold">{impersonatedTenantSlug}</span>
            <button 
              onClick={() => setImpersonatedTenantSlug(null)}
              className="bg-white text-brand-600 px-3 py-1 rounded text-xs font-bold hover:bg-surface-100"
            >
              Back to Admin Panel
            </button>
          </div>
        )}
        {state.isLastDay && <SubscriptionExpirationBanner />}
        {renderApp(slug!, {
          role: state.userRole?.role ?? "employee",
          permissions: state.userRole?.permissions ?? defaultPermissions
        }, signOut)}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <AuthSessionCard session={authState.session} />
        
        <div className="card overflow-hidden">
          <div className="bg-brand-500 p-4 text-white">
            <h2 className="text-lg font-bold">Tenant Cargado</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <span className="text-sm text-content-secondary">Slug:</span>
              <span className="font-bold text-content-primary">{state.tenant?.tenantSlug}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-content-secondary">Rol:</span>
              <span className="badge badge-info">{state.userRole?.role}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
