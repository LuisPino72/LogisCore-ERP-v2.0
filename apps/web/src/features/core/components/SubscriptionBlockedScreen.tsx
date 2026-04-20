// Core - Pantalla de bloqueo cuando la suscripción está inactiva
import type { EventBus, Result, AppError } from "@logiscore/core";
import { Button } from "@/common/components/Button";

interface SubscriptionBlockedScreenProps {
  tenantName: string;
  eventBus: EventBus;
  onLogout: () => Promise<Result<void, AppError>>;
}

export function SubscriptionBlockedScreen({ tenantName, eventBus, onLogout }: SubscriptionBlockedScreenProps) {
  const handleLogout = async () => {
    eventBus.emit("AUTH.SIGNED_OUT", {});
    await onLogout();
  };

  return (
    <div className="grid min-h-screen place-items-center bg-linear-to-br from-surface-50 via-surface-100 to-surface-50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-state-error/20 bg-surface-0 p-8 shadow-xl shadow-state-error/5">
        {/* Icono de candado */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-state-error/10">
          <svg
            className="h-8 w-8 text-state-error"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
        </div>

        {/* Título */}
        <h1 className="mb-2 text-center text-2xl font-bold text-content-primary">
          Acceso Restringido
        </h1>

        {/* Texto descriptivo */}
        <p className="mb-6 text-center text-sm leading-relaxed text-content-secondary">
          La suscripción para el negocio <strong className="font-semibold text-content-primary">{tenantName}</strong> ha vencido o no se encuentra activa.
        </p>

        {/* Separador */}
        <div className="mb-6 h-px bg-surface-200" />

        {/* Información de contacto */}
        <div className="mb-8 rounded-lg bg-surface-50 p-4 text-center">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-content-tertiary">
            ¿Necesita ayuda?
          </p>
          <p className="text-sm text-content-secondary">
            Comuníquese con el soporte al
          </p>
          <p className="mt-1 text-lg font-bold text-brand-600">
            0414-5180265
          </p>
          <p className="mt-1 text-xs text-content-tertiary">
            para renovar su suscripción y restaurar el acceso.
          </p>
        </div>

        {/* Botón de acción */}
        <Button
          type="button"
          onClick={handleLogout}
          variant="primary"
          className="w-full"
        >
          Volver al Login
        </Button>
      </div>
    </div>
  );
}
