import { createServer } from "http";
import { Server } from "socket.io";
import Redis from "ioredis";
import { logger } from "@/lib/logger";

const PORT = parseInt(process.env.WS_PORT || "3001", 10);

export function startWebSocketServer() {
  const httpServer = createServer();

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    pingInterval: 25000,
    pingTimeout: 60000,
  });

  // Redis subscriber for receiving notifications from the API layer
  const subscriber = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

  // Track connected users: userId -> Set of socket IDs
  const userSockets = new Map<string, Set<string>>();

  io.on("connection", (socket) => {
    const userId = socket.handshake.auth.userId as string;

    if (!userId) {
      logger.warn("Socket connected without userId, disconnecting");
      socket.disconnect(true);
      return;
    }

    // Track this socket
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId)!.add(socket.id);

    // Subscribe to user-specific channel
    const channel = `notifications:${userId}`;
    subscriber.subscribe(channel);

    logger.info(
      { userId, socketId: socket.id, totalConnections: io.engine.clientsCount },
      "Client connected"
    );

    socket.on("disconnect", (reason) => {
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(userId);
          subscriber.unsubscribe(channel);
        }
      }
      logger.info({ userId, socketId: socket.id, reason }, "Client disconnected");
    });

    socket.on("error", (err) => {
      logger.error({ userId, socketId: socket.id, err }, "Socket error");
    });
  });

  // Forward Redis pub/sub messages to the correct sockets
  subscriber.on("message", (channel, message) => {
    // channel format: notifications:{userId}
    const userId = channel.split(":")[1];
    const sockets = userSockets.get(userId);

    if (sockets && sockets.size > 0) {
      for (const socketId of sockets) {
        io.to(socketId).emit("notification:new", JSON.parse(message));
      }
      logger.debug(
        { userId, socketCount: sockets.size },
        "Notification pushed to client"
      );
    }
  });

  httpServer.listen(PORT, () => {
    logger.info({ port: PORT }, "WebSocket server started");
  });

  // Graceful shutdown
  process.on("SIGTERM", () => {
    logger.info("Shutting down WebSocket server");
    io.close();
    subscriber.disconnect();
    httpServer.close();
  });

  return io;
}
