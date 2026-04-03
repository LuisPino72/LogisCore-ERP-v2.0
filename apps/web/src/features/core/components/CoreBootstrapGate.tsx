// Core - Gestiona el flujo de inicialización (loading/error/blocked/success)
import { useEffect } from "react";
import { BlockedAccessScreen } from "./BlockedAccessScreen";
import { useCore } from "../hooks/useCore";
import { coreService } from "../services/core.service.instance";

// Gestiona estados de bootstrap: bootstrapping, error, blocked, success
export function CoreBootstrapGate() {
  const { state, bootstrap, clearLastError } = useCore({ service: coreService });

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  if (state.isBootstrapping) {
    return <p>Inicializando sesion y sincronizacion...</p>;
  }

  if (state.lastError) {
    return (
      <section style={{ color: "var(--color-state-error)" }}>
        <p>{state.lastError.message}</p>
        <button onClick={clearLastError} type="button">
          Cerrar
        </button>
      </section>
    );
  }

  if (state.isBlocked) {
    return <BlockedAccessScreen tenantSlug={state.tenantSlug} />;
  }

  return (
    <section
      style={{
        border: "1px solid var(--color-state-info)",
        background: "rgb(59 130 246 / 0.1)",
        padding: "16px",
        borderRadius: "8px"
      }}
    >
      <h2 style={{ marginTop: 0 }}>Bootstrap completado</h2>
      <p style={{ marginBottom: 0 }}>
        Tenant activo:
        {" "}
        <strong>{state.tenantSlug ?? "N/A"}</strong>
      </p>
    </section>
  );
}
