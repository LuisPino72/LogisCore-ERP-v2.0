/**
 * Página para establecer nueva contraseña
 * Se accede desde el enlace del correo de Supabase
 */

import { useState, type FormEvent } from "react";
import type { Result, AppError } from "@logiscore/core";
import { FormField, Input } from "@/common";
import { Button } from "@/common/components/Button";
import { Card } from "@/common/components/Card";
import { Alert } from "@/common/components/Alert";

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
          <Card>
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
          </Card>
        </div>
      </div>
    );
  }

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
                Nueva Contraseña
              </h1>
              <p className="text-sm text-content-secondary mt-1">
                Ingresa tu nueva contraseña
              </p>
            </div>

            <form onSubmit={handleSubmit} className="stack-md">
              {error && (
                <Alert variant="error">{error}</Alert>
              )}

              <FormField label="Nueva Contraseña" htmlFor="newPassword" required>
                <Input
                  id="newPassword"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </FormField>

              <FormField label="Confirmar Contraseña" htmlFor="confirmPassword" required>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </FormField>

              <Button
                type="submit"
                disabled={isLoading}
                variant="primary"
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <span className="spinner" />
                    Guardando...
                  </>
                ) : (
                  "Cambiar Contraseña"
                )}
              </Button>
            </form>
          </div>
        </Card>

        <p className="text-center text-xs text-content-tertiary mt-6">
          © {new Date().getFullYear()} LogisCore ERP. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}
