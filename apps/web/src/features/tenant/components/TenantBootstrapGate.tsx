// Tenant - Gestiona la carga inicial y autenticación del tenant
import { useEffect, useState, type ReactNode } from "react";
import { AuthSessionCard, LoginPage } from "@/features/auth/components/Login";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { BlockedAccessScreen } from "@/features/core/components/BlockedAccessScreen";
import { useTenantData } from "../hooks/useTenantData";
import { adminService } from "@/features/admin/services/admin.service.instance";
import { useAdmin } from "@/features/admin/hooks/useAdmin";
import { AdminLayout, Dashboard, TenantsList, SecurityPanel, BusinessTypesPanel, SubscriptionsPanel, SettingsPanel } from "@/features/admin";
import { LoadingSpinner } from "@/common";
import type { AdminModule, Tenant, Plan } from "@/features/admin/types/admin.types";

export function SubscriptionExpirationBanner() {
  return (
    <div className="bg-state-warning text-white p-3 text-center font-bold sticky top-0 z-100 shadow-md animate-pulse">
      ⚠️ ¡Último día de servicio! Por favor comuníquese con <span className="underline">04145180265</span> para renovar su suscripción.
    </div>
  );
}

interface TenantBootstrapGateProps {
  authService: Parameters<typeof useAuth>[0]["service"];
  tenantService: Parameters<typeof useTenantData>[0]["tenant"];
  coreService: { startSync: () => unknown };
  renderApp?: (tenantSlug: string, actor: { role: string; permissions: Record<string, unknown> }) => ReactNode;
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
    })();
  }, [authState.session, bootstrapTenantData, coreService]);

  const handleLogin = async (email: string, password: string) => {
    await signIn(email, password);
  };

  const handleResetPassword = async (email: string) => {
    return await resetPassword(email);
  };

  const handleLogout = async () => {
    await signOut();
  };

  const handleAccessTenant = (tenant: Tenant) => {
    console.log("Accessing tenant:", tenant.slug);
  };

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
    return <BlockedAccessScreen tenantSlug={state.tenant?.tenantSlug ?? null} />;
  }

  if (state.userRole?.role === "admin") {
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
            plans={admin.plans} // Pasar planes
            securityUsers={admin.securityUsers}
            isLoading={admin.state.isLoading}
            onRefresh={admin.loadTenants}
            onCreate={admin.createTenant}
            onUpdate={admin.updateTenant}
            onDelete={admin.deleteTenant}
            onAccessTenant={handleAccessTenant}
            onLoadBusinessTypes={admin.loadBusinessTypes}
            onLoadSecurityUsers={admin.loadSecurityUsers}
            onLoadPlans={admin.loadPlans} // Nueva prop si es necesario para cargar planes
          />
        )}
        {activeAdminModule === "security" && (
          <SecurityPanel
            users={admin.securityUsers}
            tenants={admin.tenants}
            isLoading={admin.state.isLoading}
            onRefresh={() => { admin.loadSecurityUsers(); admin.loadTenants(); }}
            onToggleUser={admin.toggleUserStatus}
            onCreate={admin.createUser}
            onUpdate={admin.updateUser}
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
            tenants={admin.tenants}
            isLoading={admin.state.isLoading}
            onRefreshSubscriptions={admin.loadSubscriptions}
            onRefreshPlans={admin.loadPlans}
            onRefreshTenants={admin.loadTenants}
            onCreate={admin.createSubscription}
            onUpdate={admin.updateSubscription}
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

  if (renderApp && state.tenant?.tenantSlug) {
    return (
      <div className="relative">
        {state.isLastDay && <SubscriptionExpirationBanner />}
        {renderApp(state.tenant.tenantSlug, {
          role: state.userRole?.role ?? "employee",
          permissions: (state.userRole?.permissions ?? {}) as Record<string, unknown>
        })}
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
