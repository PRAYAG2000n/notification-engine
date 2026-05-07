import { create } from "zustand";
import { type NotificationType, type NotificationPriority } from "@prisma/client";

interface NotificationFilters {
  type: NotificationType | null;
  priority: NotificationPriority | null;
  isRead: boolean | null;
  channelId: string | null;
}

interface NotificationStore {
  // Filters
  filters: NotificationFilters;
  setFilter: <K extends keyof NotificationFilters>(
    key: K,
    value: NotificationFilters[K]
  ) => void;
  resetFilters: () => void;

  // UI state
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  isDetailOpen: boolean;
  setDetailOpen: (open: boolean) => void;
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // Real-time connection
  isConnected: boolean;
  setConnected: (connected: boolean) => void;
}

const defaultFilters: NotificationFilters = {
  type: null,
  priority: null,
  isRead: null,
  channelId: null,
};

export const useNotificationStore = create<NotificationStore>((set) => ({
  filters: { ...defaultFilters },
  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    })),
  resetFilters: () => set({ filters: { ...defaultFilters } }),

  selectedId: null,
  setSelectedId: (id) => set({ selectedId: id, isDetailOpen: id !== null }),
  isDetailOpen: false,
  setDetailOpen: (open) =>
    set({ isDetailOpen: open, selectedId: open ? undefined : null }),
  isSidebarCollapsed: false,
  toggleSidebar: () =>
    set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),

  isConnected: false,
  setConnected: (connected) => set({ isConnected: connected }),
}));
