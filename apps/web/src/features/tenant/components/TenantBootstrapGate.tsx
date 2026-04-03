// Tenant - Gestiona la carga inicial y autenticación del tenant
import { useEffect, useState, type ReactNode } from "react";
import { AuthSessionCard, LoginPage } from "@/features/auth/components/Login";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { BlockedAccessScreen } from "@/features/core/components/BlockedAccessScreen";
import { useTenantData } from "../hooks/useTenantData";
import { adminService } from "@/features/admin/services/admin.service.instance";
import { useAdmin } from "@/features/admin/hooks/useAdmin";
import { AdminLayout, Dashboard, TenantsList, SecurityPanel, BusinessTypesPanel, SubscriptionsPanel } from "@/features/admin";
import { LoadingSpinner } from "@/common";
import type { AdminModule, Tenant } from "@/features/admin/types/admin.types";

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
  const { state: authState, loadSession, signIn, resetPassword } = useAuth({ service: authService });
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
    await authService.signOut();
    await loadSession();
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
    return <LoadingSpinner message="Cargando sesión..." />;
  }

  if (state.lastError) {
    return <p className="text-red-700">{state.lastError.message}</p>;
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
            isLoading={admin.state.isLoading}
            onRefresh={admin.loadTenants}
            onCreate={admin.createTenant}
            onUpdate={admin.updateTenant}
            onDelete={admin.deleteTenant}
            onAccessTenant={handleAccessTenant}
          />
        )}
        {activeAdminModule === "security" && (
          <SecurityPanel
            users={admin.securityUsers}
            isLoading={admin.state.isLoading}
            onRefresh={() => admin.loadSecurityUsers()}
            onToggleUser={admin.toggleUserStatus}
          />
        )}
        {activeAdminModule === "businessTypes" && (
          <BusinessTypesPanel
            businessTypes={admin.businessTypes}
            isLoading={admin.state.isLoading}
            onRefresh={admin.loadBusinessTypes}
            onCreate={admin.createBusinessType}
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
          />
        )}
      </AdminLayout>
    );
  }

  if (renderApp && state.tenant?.tenantSlug) {
    return renderApp(state.tenant.tenantSlug, {
      role: state.userRole?.role ?? "employee",
      permissions: (state.userRole?.permissions ?? {}) as Record<string, unknown>
    });
  }

  return (
    <section>
      <AuthSessionCard session={authState.session} />
      <section className="border border-blue-300 bg-blue-50 rounded-lg p-3">
        <h2 className="mt-0">Tenant cargado</h2>
        <p style={{ margin: 0 }}>
          Slug:
          {" "}
          <strong>{state.tenant?.tenantSlug}</strong>
        </p>
        <p style={{ margin: 0 }}>
          Rol:
          {" "}
          <strong>{state.userRole?.role}</strong>
        </p>
      </section>
    </section>
  );
}
