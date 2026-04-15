import { Lock, Crown } from "lucide-react";

interface ModuleLockedOverlayProps {
  moduleName: string;
  planRequired: string;
  currentPlan: string;
  onUpgrade?: () => void;
}

export function ModuleLockedOverlay({
  moduleName,
  planRequired,
  currentPlan,
  onUpgrade
}: ModuleLockedOverlayProps) {
  return (
    <div className="relative w-full h-full min-h-[400px]">
      <div className="absolute inset-0 bg-gradient-to-br from-surface-50 via-white to-surface-100" />
      <div className="absolute inset-0 backdrop-blur-[2px]" />
      <div className="relative z-10 flex items-center justify-center h-full">
        <div className="bg-white/90 backdrop-blur-md border border-surface-200 rounded-2xl shadow-2xl p-8 max-w-md text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center shadow-lg">
              <Crown className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-content-primary mb-2">
            Módulo no disponible
          </h2>
          <p className="text-content-secondary mb-6">
            El módulo de <span className="font-semibold text-amber-600">{moduleName}</span> requiere el plan <span className="font-semibold">{planRequired}</span>.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-content-secondary mb-6">
            <Lock className="w-4 h-4" />
            <span>Tu plan actual: <span className="font-medium">{currentPlan}</span></span>
          </div>
          {onUpgrade && (
            <button
              onClick={onUpgrade}
              className="btn btn-primary w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 border-amber-500"
            >
              Actualizar a {planRequired}
            </button>
          )}
          <p className="text-xs text-content-secondary mt-4">
            Contacta al administrador del sistema para más información.
          </p>
        </div>
      </div>
    </div>
  );
}