// Core - Gestiona el flujo de inicialización (loading/error/blocked/success)
import { useEffect } from "react";
import { BlockedAccessScreen } from "./BlockedAccessScreen";
import { useCore } from "../hooks/useCore";
import { coreService } from "../services/core.service.instance";
import { eventBus } from "@/lib/core/runtime";

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
    return <BlockedAccessScreen tenantName={state.tenantName ?? "N/A"} eventBus={eventBus} />;
  }

  return (
    <section
      className="p-4 rounded-lg border"
      style={{
        borderColor: "var(--color-state-info)",
        background: "var(--color-surface-50)",
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
