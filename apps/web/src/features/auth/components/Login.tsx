/**
 * Componentes de Autenticación
 * LoginPage: Página completa de login
 * LoginForm: Formulario de acceso
 * AuthSessionCard: Muestra sesión activa
 */

import { useState, type FormEvent } from "react";
import type { AuthSession } from "../types/auth.types";
import type { AppError, Result } from "@logiscore/core";

// ============================================================================
// LoginPage - Página completa de login
// ============================================================================

interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onResetPassword: (email: string) => Promise<Result<void, AppError>>;
  isLoading: boolean;
  error: AppError | null;
}

/**
 * Página de login con branding y formulario
 */
export function LoginPage({ onLogin, onResetPassword, isLoading, error }: LoginPageProps) {
  const errorMessage = error?.message ?? null;
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setResetError(null);
    const result = await onResetPassword(resetEmail);
    if (result.ok) {
      setResetSent(true);
    } else {
      setResetError(result.error.message);
    }
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-linear-to-br from-brand-50 to-surface-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="card">
            <div className="card-body">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 mb-4">
                  <img src="/Emblema.ico" alt="LogisCore" className="w-16 h-16" />
                </div>
                <h1 className="text-2xl font-bold text-content-primary">
                  Recuperar Contraseña
                </h1>
                <p className="text-sm text-content-secondary mt-1">
                  Ingresa tu correo para recibir el enlace de recuperación
                </p>
              </div>

              {resetSent ? (
                <div className="text-center">
                  <div className="alert alert-success mb-4">
                    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>Correo enviado. Revisa tu bandeja de entrada.</span>
                  </div>
                  <button
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetSent(false);
                      setResetEmail("");
                    }}
                    className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                  >
                    Volver al login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-5">
                  {resetError && (
                    <div className="alert alert-error">
                      <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{resetError}</span>
                    </div>
                  )}

                  <div>
                    <label htmlFor="resetEmail" className="label">
                      Correo electrónico
                    </label>
                    <input
                      id="resetEmail"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      className="input"
                      placeholder="tu@correo.com"
                      autoComplete="email"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn btn-primary w-full"
                  >
                    {isLoading ? (
                      <>
                        <span className="spinner" />
                        Enviando...
                      </>
                    ) : (
                      "Enviar Enlace"
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    className="w-full text-center text-sm text-brand-600 hover:text-brand-700 font-medium"
                  >
                    Volver al login
                  </button>
                </form>
              )}
            </div>
          </div>

          <p className="text-center text-xs text-content-tertiary mt-6">
            © {new Date().getFullYear()} LogisCore ERP. Todos los derechos reservados.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-brand-50 to-surface-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="card">
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
              onForgotPassword={() => setShowForgotPassword(true)}
            />
          </div>
        </div>

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
  onForgotPassword: () => void;
}

/**
 * Formulario de login
 */
export function LoginForm({ onLogin, isLoading, error, onForgotPassword }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await onLogin(email, password);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="alert alert-error">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <div>
        <label htmlFor="email" className="label">
          Correo electrónico
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
          className="input"
          placeholder="tu@correo.com"
          autoComplete="email"
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="label mb-0">
            Contraseña
          </label>
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-sm text-brand-600 hover:text-brand-700 font-medium"
          >
            Olvidé mi contraseña
          </button>
        </div>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isLoading}
          className="input"
          placeholder="••••••••"
          autoComplete="current-password"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="btn btn-primary w-full"
      >
        {isLoading ? (
          <>
            <span className="spinner" />
            Iniciando sesión...
          </>
        ) : (
          "Iniciar Sesión"
        )}
      </button>
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
    <div className="card card-body p-3 mb-4">
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
    </div>
  );
}
