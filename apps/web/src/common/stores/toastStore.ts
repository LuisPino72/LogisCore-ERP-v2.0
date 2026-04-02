import { create } from "zustand";
import type { Toast } from "../types/common.types";

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const generateId = () => crypto.randomUUID();

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  
  addToast: (toast) => {
    const id = generateId();
    const newToast: Toast = { ...toast, id };
    
    set((state) => ({
      toasts: [...state.toasts, newToast]
    }));
    
    const duration = toast.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id)
        }));
      }, duration);
    }
    
    return id;
  },
  
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    }));
  },
  
  clearToasts: () => {
    set({ toasts: [] });
  }
}));

export const toastHelpers = {
  success: (message: string, duration?: number) =>
    useToastStore.getState().addToast({ type: "success", message, duration: duration ?? 5000 }),
  
  error: (message: string, duration?: number) =>
    useToastStore.getState().addToast({ type: "error", message, duration: duration ?? 5000 }),
  
  warning: (message: string, duration?: number) =>
    useToastStore.getState().addToast({ type: "warning", message, duration: duration ?? 5000 }),
  
  info: (message: string, duration?: number) =>
    useToastStore.getState().addToast({ type: "info", message, duration: duration ?? 5000 })
};

export const useToast = () => {
  const { addToast, removeToast, clearToasts } = useToastStore();
  
  return {
    addToast,
    removeToast,
    clearToasts,
    success: (message: string, duration?: number) => 
      addToast({ type: "success", message, duration: duration ?? 5000 }),
    error: (message: string, duration?: number) => 
      addToast({ type: "error", message, duration: duration ?? 5000 }),
    warning: (message: string, duration?: number) => 
      addToast({ type: "warning", message, duration: duration ?? 5000 }),
    info: (message: string, duration?: number) => 
      addToast({ type: "info", message, duration: duration ?? 5000 })
  };
};
