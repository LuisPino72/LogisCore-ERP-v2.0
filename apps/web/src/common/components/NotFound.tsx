export interface NotFoundProps {
  title?: string;
  message?: string;
  onBack?: () => void;
}

export function NotFound({
  title = "Página no encontrada",
  message = "La página que buscas no existe o ha sido movida.",
  onBack
}: NotFoundProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] px-4 text-center">
      <div className="w-24 h-24 mb-6 text-content-tertiary">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-content-primary mb-2">{title}</h1>
      <p className="text-content-secondary mb-6 max-w-md">{message}</p>
      {onBack && (
        <button
          onClick={onBack}
          className="px-6 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors"
        >
          Volver al inicio
        </button>
      )}
    </div>
  );
}
