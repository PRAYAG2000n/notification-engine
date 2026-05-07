"use client";

import { type Notification, type Channel } from "@prisma/client";
import {
  Bell,
  AlertTriangle,
  MessageSquare,
  CheckSquare,
  Clock,
  RefreshCw,
  MailOpen,
  Archive,
} from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNotificationStore } from "@/stores/notification-store";

type NotificationWithChannel = Notification & {
  channel: Pick<Channel, "id" | "name"> | null;
};

const typeIcons = {
  SYSTEM: Bell,
  ALERT: AlertTriangle,
  MESSAGE: MessageSquare,
  TASK: CheckSquare,
  REMINDER: Clock,
  UPDATE: RefreshCw,
} as const;

const priorityVariant = {
  LOW: "low",
  NORMAL: "normal",
  HIGH: "high",
  URGENT: "urgent",
} as const;

interface NotificationCardProps {
  notification: NotificationWithChannel;
  onMarkAsRead: (id: string) => void;
  onArchive: (id: string) => void;
}

export function NotificationCard({
  notification,
  onMarkAsRead,
  onArchive,
}: NotificationCardProps) {
  const { selectedId, setSelectedId } = useNotificationStore();
  const isSelected = selectedId === notification.id;
  const Icon = typeIcons[notification.type];

  return (
    <article
      role="listitem"
      aria-label={`${notification.type} notification: ${notification.title}`}
      aria-selected={isSelected}
      tabIndex={0}
      onClick={() => setSelectedId(notification.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setSelectedId(notification.id);
        }
      }}
      className={cn(
        "group relative flex gap-3 rounded-lg border p-4 transition-all duration-150 cursor-pointer",
        "hover:border-brand-200 hover:bg-brand-50/30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
        isSelected
          ? "border-brand-300 bg-brand-50/50"
          : "border-surface-200 bg-white",
        !notification.isRead && "border-l-4 border-l-brand-500"
      )}
    >
      {/* Unread indicator */}
      {!notification.isRead && (
        <span
          className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-brand-500 animate-pulse-dot"
          aria-label="Unread"
        />
      )}

      {/* Type icon */}
      <div
        className={cn(
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          notification.priority === "URGENT"
            ? "bg-red-100 text-red-600"
            : notification.priority === "HIGH"
            ? "bg-orange-100 text-orange-600"
            : "bg-surface-100 text-surface-500"
        )}
      >
        <Icon className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3
            className={cn(
              "text-sm leading-tight",
              notification.isRead
                ? "font-normal text-surface-600"
                : "font-semibold text-surface-900"
            )}
          >
            {notification.title}
          </h3>
          <time
            className="shrink-0 text-xs text-surface-400"
            dateTime={notification.createdAt.toISOString()}
          >
            {formatRelativeTime(new Date(notification.createdAt))}
          </time>
        </div>

        <p className="mt-1 text-sm leading-relaxed text-surface-500 line-clamp-2">
          {notification.body}
        </p>

        <div className="mt-2 flex items-center gap-2">
          <Badge
            variant={
              priorityVariant[notification.priority] as
                | "low"
                | "normal"
                | "high"
                | "urgent"
            }
          >
            {notification.priority}
          </Badge>
          {notification.channel && (
            <Badge variant="outline">{notification.channel.name}</Badge>
          )}
        </div>

        {/* Actions (visible on hover/focus) */}
        <div
          className={cn(
            "mt-2 flex gap-1 opacity-0 transition-opacity",
            "group-hover:opacity-100 group-focus-within:opacity-100"
          )}
        >
          {!notification.isRead && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsRead(notification.id);
              }}
              aria-label="Mark as read"
            >
              <MailOpen className="h-3.5 w-3.5" />
              Read
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onArchive(notification.id);
            }}
            aria-label="Archive notification"
          >
            <Archive className="h-3.5 w-3.5" />
            Archive
          </Button>
        </div>
      </div>
    </article>
  );
}
