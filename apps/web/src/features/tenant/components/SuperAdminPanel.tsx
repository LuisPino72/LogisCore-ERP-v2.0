/**
 * Panel de administración para super-admins.
 * Muestra información y controles exclusivos para el rol admin.
 */

export function SuperAdminPanel() {
  return (
    <section
      style={{
        border: "1px solid #a3e635",
        borderRadius: "8px",
        background: "#f7fee7",
        padding: "12px",
        marginBottom: "16px"
      }}
    >
      <h2 style={{ marginTop: 0 }}>Admin Panel</h2>
      <p style={{ margin: 0 }}>
        Sesion detectada con rol <strong>admin</strong>. Desde aqui debe
        iniciarse el flujo de administracion global de tenants.
      </p>
    </section>
  );
}
