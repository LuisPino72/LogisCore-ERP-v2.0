/**
 * Componentes de Autenticación
 * LoginPage: Página completa de login
 * LoginForm: Formulario de acceso
 * AuthSessionCard: Muestra sesión activa
 */

import { useState, type FormEvent } from "react";
import type { AuthSession } from "../types/auth.types";
import type { AppError } from "@logiscore/core";
import { FormField, Input } from "@/common";
import { Button } from "@/common/components/Button";
import { Card } from "@/common/components/Card";
import { Alert } from "@/common/components/Alert";

// ============================================================================
// LoginPage - Página completa de login
// ============================================================================

interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<void>;
  isLoading: boolean;
  error: AppError | null;
}

/**
 * Página de login con branding y formulario
 */
export function LoginPage({ onLogin, isLoading, error }: LoginPageProps) {
  const errorMessage = error?.message ?? null;

  return (
    <div className="min-h-screen bg-linear-to-br from-brand-50 to-surface-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <div className="card-body">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 mb-4">
                <img src="/Emblema.ico" alt="LogisCore" className="w-16 h-16" />
              </div>
              <h1 className="text-2xl font-bold text-content-primary">
                LogisCore
              </h1>
              <p className="text-sm text-content-secondary mt-1">
                Gestión Empresarial
              </p>
            </div>

            <LoginForm
              onLogin={onLogin}
              isLoading={isLoading}
              error={errorMessage}
            />
          </div>
        </Card>

        <p className="text-center text-xs text-content-tertiary mt-6">
          © {new Date().getFullYear()} LogisCore ERP. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// LoginForm - Formulario de acceso
// ============================================================================

interface LoginFormProps {
  onLogin: (email: string, password: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Formulario de login
 */
export function LoginForm({ onLogin, isLoading, error }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await onLogin(email, password);
  };

  return (
    <form onSubmit={handleSubmit} className="stack-md">
      {error && (
        <Alert variant="error">{error}</Alert>
      )}

      <FormField label="Correo electrónico" htmlFor="email" required>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
          placeholder="tu@correo.com"
          autoComplete="email"
        />
      </FormField>

      <FormField 
        label="Contraseña" 
        htmlFor="password" 
        required
      >
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isLoading}
          placeholder="••••••••"
          autoComplete="current-password"
        />
      </FormField>

      <Button
        type="submit"
        disabled={isLoading}
        variant="primary"
        className="w-full mt-4"
      >
        {isLoading ? (
          <>
            <span className="spinner" />
            Iniciando sesión...
          </>
        ) : (
          "Iniciar Sesión"
        )}
      </Button>
    </form>
  );
}

// ============================================================================
// AuthSessionCard - Muestra sesión activa
// ============================================================================

interface AuthSessionCardProps {
  session: AuthSession;
}

/**
 * Tarjeta que muestra la sesión actual
 */
export function AuthSessionCard({ session }: AuthSessionCardProps) {
  return (
    <Card className="card-body p-3 mb-4">
      <h3 className="text-sm font-semibold text-content-primary mb-2">
        Sesión activa
      </h3>
      <p className="text-sm text-content-secondary">
        Usuario: <span className="font-medium text-content-primary">{session.userId}</span>
      </p>
      {session.email && (
        <p className="text-sm text-content-secondary">
          Correo: <span className="font-medium text-content-primary">{session.email}</span>
        </p>
      )}
    </Card>
  );
}
