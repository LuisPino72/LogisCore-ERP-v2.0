import type { AuthSession } from "../types/auth.types";

interface AuthSessionCardProps {
  session: AuthSession;
}

export function AuthSessionCard({ session }: AuthSessionCardProps) {
  return (
    <section
      style={{
        marginBottom: "16px",
        border: "1px solid #cbd5e1",
        borderRadius: "8px",
        padding: "12px",
        background: "#f8fafc"
      }}
    >
      <h2 style={{ marginTop: 0 }}>Sesion activa</h2>
      <p style={{ margin: 0 }}>
        Usuario:
        {" "}
        <strong>{session.userId}</strong>
      </p>
      {session.email ? (
        <p style={{ margin: 0 }}>
          Correo:
          {" "}
          <strong>{session.email}</strong>
        </p>
      ) : null}
    </section>
  );
}
