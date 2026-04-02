// Tenant - Gestiona la carga inicial y autenticación del tenant
import { useEffect, type ReactNode } from "react";
import { AuthSessionCard, LoginPage } from "@/features/auth/components/Login";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { BlockedAccessScreen } from "@/features/core/components/BlockedAccessScreen";
import { useTenantData } from "../hooks/useTenantData";
import { SuperAdminPanel } from "./SuperAdminPanel";

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
    return <p>Bootstrap inicial: auth, tenant, permisos y suscripcion...</p>;
  }

  if (state.lastError) {
    return <p style={{ color: "#b91c1c" }}>{state.lastError.message}</p>;
  }

  if (state.isBlocked) {
    return <BlockedAccessScreen tenantSlug={state.tenant?.tenantSlug ?? null} />;
  }

  if (state.userRole?.role === "super_admin") {
    return (
      <section>
        <AuthSessionCard session={authState.session} />
        <SuperAdminPanel />
      </section>
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
      <section
        style={{
          border: "1px solid #93c5fd",
          borderRadius: "8px",
          background: "#dbeafe",
          padding: "12px"
        }}
      >
        <h2 style={{ marginTop: 0 }}>Tenant cargado</h2>
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
