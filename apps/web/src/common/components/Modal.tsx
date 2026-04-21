import { useEffect, useCallback, type ReactNode } from "react";
import type { ModalSize } from "../types/common.types";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: ModalSize;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  footer?: ReactNode;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-sm sm:mx-4",
  md: "max-w-md sm:mx-4",
  lg: "max-w-lg sm:mx-4",
  xl: "max-w-xl sm:mx-4",
  full: "max-w-4xl sm:mx-2 sm:my-2"
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  closeOnOverlayClick = true,
  closeOnEscape = true,
  footer
}: ModalProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape" && closeOnEscape) {
      onClose();
    }
  }, [onClose, closeOnEscape]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
      <div 
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={closeOnOverlayClick ? onClose : undefined}
      />
      <div className={`relative bg-white rounded-none sm:rounded-xl shadow-xl w-full h-full sm:h-auto max-h-[90vh] sm:max-h-[85vh] flex flex-col ${sizeClasses[size]} animate-in fade-in zoom-in-95 duration-200`}>
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-surface-200 shrink-0">
          <h2 className="text-base sm:text-lg font-semibold text-content-primary">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-content-tertiary hover:bg-surface-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          {children}
        </div>
        {footer && (
          <div className="flex items-center justify-end gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-surface-200 bg-surface-50 rounded-b-none sm:rounded-b-xl shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
