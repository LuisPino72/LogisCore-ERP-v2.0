import { Modal } from "./Modal";

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "primary" | "danger";
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "primary",
  isLoading = false
}: ConfirmDialogProps) {
  const confirmButtonClass = variant === "danger" 
    ? "bg-red-600 hover:bg-red-700 text-white"
    : "bg-brand-500 hover:bg-brand-600 text-white";

  const footer = (
    <>
      <button
        onClick={onClose}
        disabled={isLoading}
        className="px-4 py-2 text-sm font-medium text-content-secondary bg-surface-100 rounded-lg hover:bg-surface-200 transition-colors disabled:opacity-50"
      >
        {cancelLabel}
      </button>
      <button
        onClick={onConfirm}
        disabled={isLoading}
        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${confirmButtonClass}`}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Procesando...
          </span>
        ) : confirmLabel}
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={footer}
    >
      <p className="text-content-secondary">{message}</p>
    </Modal>
  );
}
