"use client";

import { useEffect, useRef, useCallback } from "react";
import { io, type Socket } from "socket.io-client";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc";
import { useNotificationStore } from "@/stores/notification-store";

export function useWebSocket() {
  const { data: session } = useSession();
  const socketRef = useRef<Socket | null>(null);
  const { setConnected } = useNotificationStore();
  const utils = trpc.useUtils();

  const connect = useCallback(() => {
    if (!session?.user?.id) return;
    if (socketRef.current?.connected) return;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001";

    const socket = io(wsUrl, {
      auth: { userId: session.user.id },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    socket.on("connect", () => {
      console.log("[WS] Connected");
      setConnected(true);
    });

    socket.on("disconnect", (reason) => {
      console.log("[WS] Disconnected:", reason);
      setConnected(false);
    });

    socket.on("notification:new", () => {
      // Invalidate queries to refetch with latest data
      utils.notification.list.invalidate();
      utils.notification.unreadCount.invalidate();
      utils.notification.stats.invalidate();
    });

    socket.on("notification:read", () => {
      utils.notification.list.invalidate();
      utils.notification.unreadCount.invalidate();
    });

    socket.on("connect_error", (err) => {
      console.error("[WS] Connection error:", err.message);
      setConnected(false);
    });

    socketRef.current = socket;
  }, [session?.user?.id, setConnected, utils]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setConnected(false);
    }
  }, [setConnected]);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    socket: socketRef.current,
    connect,
    disconnect,
  };
}
