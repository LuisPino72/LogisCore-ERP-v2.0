// Core - Muestra pantalla de acceso bloqueado cuando la suscripción está inactiva
interface BlockedAccessScreenProps {
  tenantSlug: string | null;
}

export function BlockedAccessScreen({ tenantSlug }: BlockedAccessScreenProps) {
  return (
    <section
      style={{
        border: "1px solid var(--color-state-error)",
        background: "rgb(254 242 242 / 0.5)",
        color: "var(--color-state-error)",
        padding: "16px",
        borderRadius: "8px",
        marginBottom: "16px"
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
