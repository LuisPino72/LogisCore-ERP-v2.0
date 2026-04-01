import { useEffect } from "react";
import { AuthSessionCard } from "@/features/auth/components/AuthSessionCard";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { BlockedAccessScreen } from "@/features/core/components/BlockedAccessScreen";
import { useTenantData } from "../hooks/useTenantData";
import { SuperAdminPanel } from "./SuperAdminPanel";

interface TenantBootstrapGateProps {
  authService: Parameters<typeof useAuth>[0]["service"];
  tenantService: Parameters<typeof useTenantData>[0]["tenant"];
  coreService: { startSync: () => unknown };
}

export function TenantBootstrapGate({
  authService,
  tenantService,
  coreService
}: TenantBootstrapGateProps) {
  const { state: authState, loadSession } = useAuth({ service: authService });
  const { state, bootstrapTenantData } = useTenantData({
    auth: authService,
    tenant: tenantService
  });

  useEffect(() => {
    void (async () => {
      await loadSession();
      await bootstrapTenantData();
      coreService.startSync();
    })();
  }, [bootstrapTenantData, coreService, loadSession]);

  if (authState.isLoading || state.isLoading) {
    return <p>Bootstrap inicial: auth, tenant, permisos y suscripcion...</p>;
  }

  if (authState.lastError) {
    return <p style={{ color: "#b91c1c" }}>{authState.lastError.message}</p>;
  }

  if (state.lastError) {
    return <p style={{ color: "#b91c1c" }}>{state.lastError.message}</p>;
  }

  if (!authState.session) {
    return <p>No hay sesion activa.</p>;
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
