/**
 * Página para establecer nueva contraseña
 * Se accede desde el enlace del correo de Supabase
 */

import { useState, type FormEvent } from "react";
import type { Result, AppError } from "@logiscore/core";

interface ResetPasswordPageProps {
  onUpdatePassword: (password: string) => Promise<Result<void, AppError>>;
  onPasswordReset: () => void;
}

export function ResetPasswordPage({ onUpdatePassword, onPasswordReset }: ResetPasswordPageProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setIsLoading(true);
    const result = await onUpdatePassword(password);
    setIsLoading(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      onPasswordReset();
    }, 3000);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-linear-to-br from-brand-50 to-surface-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="card">
            <div className="card-body text-center">
              <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-content-primary mb-2">
                Contraseña Actualizada
              </h1>
              <p className="text-sm text-content-secondary mb-4">
                Tu contraseña ha sido cambiada exitosamente. Serás redirigido al login...
              </p>
              <a href="/" className="text-sm text-brand-600 hover:text-brand-700 font-medium">
                Ir al login ahora
              </a>
            </div>
          </div>
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
                Nueva Contraseña
              </h1>
              <p className="text-sm text-content-secondary mt-1">
                Ingresa tu nueva contraseña
              </p>
            </div>

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
                <label htmlFor="newPassword" className="label">
                  Nueva Contraseña
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="input"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="label">
                  Confirmar Contraseña
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="input"
                  placeholder="••••••••"
                  autoComplete="new-password"
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
                    Guardando...
                  </>
                ) : (
                  "Cambiar Contraseña"
                )}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-xs text-content-tertiary mt-6">
          © {new Date().getFullYear()} LogisCore ERP. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}
