"use client";

import { useSession, signOut } from "next-auth/react";
import {
  Bell,
  Settings,
  Hash,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useNotificationStore } from "@/stores/notification-store";

interface SidebarProps {
  activeView: "notifications" | "channels" | "settings" | "analytics";
  onViewChange: (view: "notifications" | "channels" | "settings" | "analytics") => void;
}

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const { data: session } = useSession();
  const { isSidebarCollapsed, toggleSidebar, isConnected } =
    useNotificationStore();
  const { data: unreadData } = trpc.notification.unreadCount.useQuery();

  const navItems = [
    {
      id: "notifications" as const,
      label: "Notifications",
      icon: Bell,
      badge: unreadData?.count ?? 0,
    },
    { id: "channels" as const, label: "Channels", icon: Hash },
    { id: "analytics" as const, label: "Analytics", icon: BarChart3 },
    { id: "settings" as const, label: "Settings", icon: Settings },
  ];

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-surface-200 bg-surface-50 transition-all duration-200",
        isSidebarCollapsed ? "w-16" : "w-60"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-200 p-3">
        {!isSidebarCollapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
              <Bell className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold text-surface-900">
              NotifyHub
            </span>
          </div>
        )}
        <Button variant="ghost" size="icon" onClick={toggleSidebar}>
          {isSidebarCollapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Connection status */}
      <div className="flex items-center gap-2 px-4 py-2">
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            isConnected ? "bg-emerald-500" : "bg-red-500"
          )}
        />
        {!isSidebarCollapsed && (
          <span className="text-xs text-surface-400">
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2" aria-label="Main navigation">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              activeView === item.id
                ? "bg-brand-100 text-brand-700"
                : "text-surface-600 hover:bg-surface-100 hover:text-surface-800"
            )}
            aria-current={activeView === item.id ? "page" : undefined}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!isSidebarCollapsed && (
              <>
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-600 px-1.5 text-[10px] font-bold text-white">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </>
            )}
          </button>
        ))}
      </nav>

      {/* User section */}
      {session?.user && (
        <div className="border-t border-surface-200 p-3">
          <div className="flex items-center gap-2">
            {session.user.image ? (
              <img
                src={session.user.image}
                alt=""
                className="h-8 w-8 rounded-full"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                {session.user.name?.charAt(0) ?? "U"}
              </div>
            )}
            {!isSidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-surface-800">
                  {session.user.name}
                </p>
                <p className="truncate text-xs text-surface-400">
                  {session.user.role}
                </p>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => signOut()}
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </aside>
  );
}
