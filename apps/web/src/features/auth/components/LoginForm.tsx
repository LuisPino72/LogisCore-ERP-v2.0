/**
 * Componente de formulario de login
 * UI para iniciar sesión con email y password
 */

import { useState, type FormEvent } from "react";

/**
 * Props del LoginForm
 * onLogin: Función a ejecutar al enviar el formulario
 * isLoading: Indica si hay una operación en curso
 * error: Mensaje de error a mostrar (null si no hay error)
 */
interface LoginFormProps {
  onLogin: (email: string, password: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Formulario de login
 * @param onLogin - Función que maneja el login
 * @param isLoading - Estado de carga
 * @param error - Mensaje de error
 */
export function LoginForm({ onLogin, isLoading, error }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  /**
   * Maneja el envío del formulario
   * Previene el comportamiento por defecto y llama a onLogin
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await onLogin(email, password);
  };

  return (
    <section
      style={{
        maxWidth: 400,
        margin: "80px auto",
        padding: 32,
        borderRadius: 12,
        background: "#fff",
        boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        fontFamily: "system-ui, sans-serif"
      }}
    >
      <h2 style={{ marginTop: 0, marginBottom: 24, textAlign: "center", color: "#1e293b" }}>
        Iniciar Sesión
      </h2>
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label
            htmlFor="email"
            style={{ display: "block", marginBottom: 6, fontWeight: 500, color: "#475569" }}
          >
            Correo electrónico
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 6,
              border: "1px solid #cbd5e1",
              fontSize: 14,
              boxSizing: "border-box"
            }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label
            htmlFor="password"
            style={{ display: "block", marginBottom: 6, fontWeight: 500, color: "#475569" }}
          >
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 6,
              border: "1px solid #cbd5e1",
              fontSize: 14,
              boxSizing: "border-box"
            }}
          />
        </div>

        {error && (
          <div
            style={{
              marginBottom: 16,
              padding: "10px 12px",
              borderRadius: 6,
              background: "#fef2f2",
              color: "#dc2626",
              fontSize: 13
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: 6,
            border: "none",
            background: isLoading ? "#94a3b8" : "#2563eb",
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            cursor: isLoading ? "not-allowed" : "pointer",
            transition: "background 0.2s"
          }}
        >
          {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
        </button>
      </form>
    </section>
  );
}
