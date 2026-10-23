import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  activeModal: string | null;
  modalData: any;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  openModal: (modalId: string, data?: any) => void;
  closeModal: () => void;
}

// Initialize theme from localStorage or default to dark
const savedTheme = (localStorage.getItem('theme') as 'light' | 'dark') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  theme: savedTheme,
  activeModal: null,
  modalData: null,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  setTheme: (theme) => {
    set({ theme });
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  },

  openModal: (modalId, data) => set({ activeModal: modalId, modalData: data }),

  closeModal: () => set({ activeModal: null, modalData: null }),
}));
