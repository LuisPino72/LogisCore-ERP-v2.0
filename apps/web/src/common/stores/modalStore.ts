import { create } from "zustand";
import type { ModalConfig, ModalSize } from "../types/common.types";

interface ModalState {
  modals: Record<string, { config: ModalConfig; data?: unknown }>;
  openModal: (id: string, config: ModalConfig, data?: unknown) => void;
  closeModal: (id: string) => void;
  closeAllModals: () => void;
  isModalOpen: (id: string) => boolean;
  getModalData: (id: string) => unknown;
}

const defaultConfig: ModalConfig = {
  title: "",
  size: "md" as ModalSize,
  closeOnOverlayClick: true,
  closeOnEscape: true
};

export const useModalStore = create<ModalState>((set, get) => ({
  modals: {},
  
  openModal: (id, config, data) => {
    set((state) => ({
      modals: {
        ...state.modals,
        [id]: { config: { ...defaultConfig, ...config }, data }
      }
    }));
  },
  
  closeModal: (id) => {
    set((state) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [id]: _removed, ...rest } = state.modals;
      return { modals: rest };
    });
  },
  
  closeAllModals: () => {
    set({ modals: {} });
  },
  
  isModalOpen: (id) => {
    return id in get().modals;
  },
  
  getModalData: (id) => {
    return get().modals[id]?.data;
  }
}));

export const useModal = () => {
  const { openModal, closeModal, closeAllModals, isModalOpen, getModalData } = useModalStore();
  
  return {
    openModal,
    closeModal,
    closeAllModals,
    isModalOpen,
    getModalData
  };
};
