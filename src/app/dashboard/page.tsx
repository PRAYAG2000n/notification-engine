"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { NotificationList } from "@/components/notifications/notification-list";
import { FilterBar } from "@/components/notifications/filter-bar";
import { StatsBar } from "@/components/notifications/stats-bar";
import { useWebSocket } from "@/hooks/use-websocket";

type ViewType = "notifications" | "channels" | "settings" | "analytics";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [activeView, setActiveView] = useState<ViewType>("notifications");

  // Connect to WebSocket for real-time updates
  useWebSocket();

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />

      <main className="flex flex-1 flex-col overflow-hidden">
        {activeView === "notifications" && (
          <>
            <StatsBar />
            <FilterBar />
            <div className="flex-1 overflow-y-auto">
              <NotificationList />
            </div>
          </>
        )}

        {activeView === "channels" && (
          <div className="flex flex-1 items-center justify-center text-surface-400">
            <p className="text-sm">Channel management view</p>
          </div>
        )}

        {activeView === "analytics" && (
          <div className="flex flex-1 items-center justify-center text-surface-400">
            <p className="text-sm">Analytics dashboard</p>
          </div>
        )}

        {activeView === "settings" && (
          <div className="flex flex-1 items-center justify-center text-surface-400">
            <p className="text-sm">Notification preferences</p>
          </div>
        )}
      </main>
    </div>
  );
}
