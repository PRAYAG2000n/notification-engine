import { describe, it, expect, beforeEach } from "vitest";
import { useNotificationStore } from "@/stores/notification-store";

describe("useNotificationStore", () => {
  beforeEach(() => {
    // Reset store between tests
    useNotificationStore.setState({
      filters: { type: null, priority: null, isRead: null, channelId: null },
      selectedId: null,
      isDetailOpen: false,
      isSidebarCollapsed: false,
      isConnected: false,
    });
  });

  describe("filters", () => {
    it("sets a single filter", () => {
      useNotificationStore.getState().setFilter("type", "ALERT");
      expect(useNotificationStore.getState().filters.type).toBe("ALERT");
    });

    it("preserves other filters when setting one", () => {
      const { setFilter } = useNotificationStore.getState();
      setFilter("type", "ALERT");
      setFilter("priority", "HIGH");

      const { filters } = useNotificationStore.getState();
      expect(filters.type).toBe("ALERT");
      expect(filters.priority).toBe("HIGH");
    });

    it("resets all filters", () => {
      const { setFilter, resetFilters } = useNotificationStore.getState();
      setFilter("type", "ALERT");
      setFilter("isRead", false);
      resetFilters();

      const { filters } = useNotificationStore.getState();
      expect(filters.type).toBeNull();
      expect(filters.isRead).toBeNull();
    });
  });

  describe("selection", () => {
    it("sets selected notification and opens detail", () => {
      useNotificationStore.getState().setSelectedId("notif-1");
      const state = useNotificationStore.getState();
      expect(state.selectedId).toBe("notif-1");
      expect(state.isDetailOpen).toBe(true);
    });

    it("clears selection when set to null", () => {
      useNotificationStore.getState().setSelectedId("notif-1");
      useNotificationStore.getState().setSelectedId(null);
      const state = useNotificationStore.getState();
      expect(state.selectedId).toBeNull();
      expect(state.isDetailOpen).toBe(false);
    });
  });

  describe("sidebar", () => {
    it("toggles sidebar collapsed state", () => {
      expect(useNotificationStore.getState().isSidebarCollapsed).toBe(false);
      useNotificationStore.getState().toggleSidebar();
      expect(useNotificationStore.getState().isSidebarCollapsed).toBe(true);
      useNotificationStore.getState().toggleSidebar();
      expect(useNotificationStore.getState().isSidebarCollapsed).toBe(false);
    });
  });

  describe("connection", () => {
    it("tracks WebSocket connection status", () => {
      expect(useNotificationStore.getState().isConnected).toBe(false);
      useNotificationStore.getState().setConnected(true);
      expect(useNotificationStore.getState().isConnected).toBe(true);
    });
  });
});
