// Core - Muestra pantalla de acceso bloqueado cuando la suscripción está inactiva
interface BlockedAccessScreenProps {
  tenantSlug: string | null;
}

export function BlockedAccessScreen({ tenantSlug }: BlockedAccessScreenProps) {
  return (
    <section
      className="p-4 rounded-lg border mb-4"
      style={{
        borderColor: "var(--color-state-error)",
        background: "var(--color-surface-50)",
        color: "var(--color-state-error)",
      }}
    >
      <h2 style={{ marginTop: 0 }}>Acceso bloqueado</h2>
      <p style={{ marginBottom: 0 }}>
        La suscripcion del tenant
        {" "}
        <strong>{tenantSlug ?? "N/A"}</strong>
        {" "}
        no esta activa.
      </p>
    </section>
  );
}
