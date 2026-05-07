import { createServer } from "http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const PORT = parseInt(process.env.WS_PORT || "3001", 10);

async function main() {
  const httpServer = createServer((req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", connections: io.engine.clientsCount }));
      return;
    }
    res.writeHead(404);
    res.end();
  });

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
    },
    pingInterval: 10000,
    pingTimeout: 5000,
    transports: ["websocket", "polling"],
  });

  // Redis adapter for horizontal scaling
  const pubClient = createClient({ url: process.env.REDIS_URL || "redis://localhost:6379" });
  const subClient = pubClient.duplicate();
  await Promise.all([pubClient.connect(), subClient.connect()]);
  io.adapter(createAdapter(pubClient, subClient));

  console.log(`[WS] Redis adapter connected`);

  // Track connected users
  const connectedUsers = new Map<string, Set<string>>();

  io.on("connection", (socket) => {
    const userId = socket.handshake.auth?.userId || socket.handshake.headers["x-user-id"] || "anonymous";

    // Track this connection
    if (!connectedUsers.has(userId)) {
      connectedUsers.set(userId, new Set());
    }
    connectedUsers.get(userId)!.add(socket.id);

    // Join user-specific room
    socket.join(`user:${userId}`);

    console.log(`[WS] User ${userId} connected (socket: ${socket.id}, total: ${io.engine.clientsCount})`);

    socket.emit("connected", {
      type: "connected",
      userId,
      timestamp: new Date().toISOString(),
    });

    // Handle auth handshake from load test
    socket.on("auth", (data: { userId?: string }) => {
      if (data.userId) {
        socket.join(`user:${data.userId}`);
        socket.emit("auth_ok", {
          type: "auth_ok",
          userId: data.userId,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Handle ping from load test
    socket.on("ping_custom", (data: { timestamp?: string }) => {
      socket.emit("pong_custom", {
        type: "pong_custom",
        timestamp: data.timestamp || new Date().toISOString(),
        serverTime: new Date().toISOString(),
      });
    });

    // Handle message events (generic)
    socket.on("message", (data: string | object) => {
      try {
        const parsed = typeof data === "string" ? JSON.parse(data) : data;

        if (parsed.type === "auth") {
          socket.join(`user:${parsed.userId}`);
          socket.emit("message", JSON.stringify({
            type: "auth_ok",
            userId: parsed.userId,
            timestamp: new Date().toISOString(),
          }));
        } else if (parsed.type === "ping") {
          socket.emit("message", JSON.stringify({
            type: "pong",
            timestamp: parsed.timestamp || new Date().toISOString(),
            serverTime: new Date().toISOString(),
          }));
        }
      } catch {
        // Ignore malformed messages
      }
    });

    // Mark notification as read
    socket.on("notification:read", async (data: { notificationId: string }) => {
      try {
        await prisma.notification.update({
          where: { id: data.notificationId },
          data: { isRead: true, readAt: new Date() },
        });

        socket.emit("notification:updated", {
          type: "notification:updated",
          notificationId: data.notificationId,
          isRead: true,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        socket.emit("error", { message: "Failed to mark as read" });
      }
    });

    socket.on("disconnect", (reason) => {
      const userSockets = connectedUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          connectedUsers.delete(userId);
        }
      }
      console.log(`[WS] User ${userId} disconnected (reason: ${reason}, total: ${io.engine.clientsCount})`);
    });
  });

  // Subscribe to Redis channel for broadcasting notifications
  const subscriber = createClient({ url: process.env.REDIS_URL || "redis://localhost:6379" });
  await subscriber.connect();

  await subscriber.subscribe("notifications", (message) => {
    try {
      const notification = JSON.parse(message);
      const targetUserId = notification.userId;

      if (targetUserId) {
        io.to(`user:${targetUserId}`).emit("notification:new", {
          type: "notification:new",
          data: notification,
          timestamp: new Date().toISOString(),
        });
      } else {
        io.emit("notification:new", {
          type: "notification:new",
          data: notification,
          timestamp: new Date().toISOString(),
        });
      }
    } catch {
      // Ignore malformed messages
    }
  });

  httpServer.listen(PORT, () => {
    console.log(`[WS] WebSocket server running on port ${PORT}`);
    console.log(`[WS] Health check: http://localhost:${PORT}/health`);
  });

  // Graceful shutdown
  process.on("SIGTERM", async () => {
    console.log("[WS] Shutting down...");
    io.close();
    await pubClient.quit();
    await subClient.quit();
    await subscriber.quit();
    await prisma.$disconnect();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("[WS] Failed to start:", err);
  process.exit(1);
});
