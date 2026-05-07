"use client";

import { useCallback, useEffect, useRef } from "react";
import { Loader2, InboxIcon, Filter, CheckCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { NotificationCard } from "./notification-card";
import { useNotificationStore } from "@/stores/notification-store";

export function NotificationList() {
  const { filters } = useNotificationStore();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = trpc.notification.list.useInfiniteQuery(
    {
      limit: 20,
      type: filters.type ?? undefined,
      priority: filters.priority ?? undefined,
      isRead: filters.isRead ?? undefined,
      channelId: filters.channelId ?? undefined,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  const utils = trpc.useUtils();

  const markAsRead = trpc.notification.markAsRead.useMutation({
    onSuccess: () => {
      utils.notification.list.invalidate();
      utils.notification.unreadCount.invalidate();
    },
  });

  const markAllAsRead = trpc.notification.markAllAsRead.useMutation({
    onSuccess: () => {
      utils.notification.list.invalidate();
      utils.notification.unreadCount.invalidate();
    },
  });

  const archive = trpc.notification.archive.useMutation({
    onSuccess: () => {
      utils.notification.list.invalidate();
      utils.notification.unreadCount.invalidate();
    },
  });

  // Intersection observer for infinite scroll
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      threshold: 0.1,
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, [handleObserver]);

  const allNotifications =
    data?.pages.flatMap((page) => page.notifications) ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-surface-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-200 px-4 py-3">
        <h2 className="text-lg font-semibold text-surface-900">
          Notifications
        </h2>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending}
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        </div>
      </div>

      {/* Notification list */}
      {allNotifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-surface-400">
          <InboxIcon className="h-12 w-12 mb-3" />
          <p className="text-sm font-medium">No notifications</p>
          <p className="text-xs mt-1">You're all caught up.</p>
        </div>
      ) : (
        <div
          role="list"
          aria-label="Notifications"
          className="flex flex-col gap-2 p-3 scrollbar-thin overflow-y-auto"
        >
          {allNotifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification as any}
              onMarkAsRead={(id) => markAsRead.mutate({ id })}
              onArchive={(id) => archive.mutate({ id })}
            />
          ))}

          {/* Infinite scroll trigger */}
          <div ref={loadMoreRef} className="h-4">
            {isFetchingNextPage && (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-surface-400" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
