import { create } from 'zustand';

interface Alert {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  timestamp: number;
}

interface AlertState {
  alerts: Alert[];
  alertedRooms: Set<string>;
  addAlert: (type: Alert['type'], message: string) => void;
  removeAlert: (id: string) => void;
  addAlertedRoom: (roomKey: string) => void;
  clearAlerts: () => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  alerts: [],
  alertedRooms: new Set(),

  addAlert: (type, message) => {
    const alert: Alert = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      message,
      timestamp: Date.now(),
    };

    set((state) => ({ alerts: [...state.alerts, alert] }));

    // Auto-remove after 5 seconds
    setTimeout(() => {
      set((state) => ({
        alerts: state.alerts.filter((a) => a.id !== alert.id),
      }));
    }, 5000);
  },

  removeAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.filter((alert) => alert.id !== id),
    })),

  addAlertedRoom: (roomKey) =>
    set((state) => ({
      alertedRooms: new Set(state.alertedRooms).add(roomKey),
    })),

  clearAlerts: () => set({ alerts: [] }),
}));
