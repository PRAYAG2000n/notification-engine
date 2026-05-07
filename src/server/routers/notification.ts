import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  router,
  protectedProcedure,
  adminProcedure,
} from "@/server/trpc";

export const notificationRouter = router({
  // Paginated list with filters
  list: protectedProcedure
    .input(
      z.object({
        cursor: z.string().nullish(),
        limit: z.number().min(1).max(100).default(20),
        type: z.enum(["SYSTEM", "ALERT", "MESSAGE", "TASK", "REMINDER", "UPDATE"]).optional(),
        priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
        isRead: z.boolean().optional(),
        channelId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { cursor, limit, type, priority, isRead, channelId } = input;

      const notifications = await ctx.prisma.notification.findMany({
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        where: {
          userId: ctx.session.user.id,
          isArchived: false,
          ...(type && { type }),
          ...(priority && { priority }),
          ...(isRead !== undefined && { isRead }),
          ...(channelId && { channelId }),
        },
        orderBy: { createdAt: "desc" },
        include: {
          channel: { select: { id: true, name: true } },
        },
      });

      let nextCursor: typeof cursor = undefined;
      if (notifications.length > limit) {
        const nextItem = notifications.pop();
        nextCursor = nextItem!.id;
      }

      return { notifications, nextCursor };
    }),

  // Unread count (cached in Redis)
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const cacheKey = `unread:${ctx.session.user.id}`;
    const cached = await ctx.redis.get(cacheKey);

    if (cached !== null) {
      return { count: parseInt(cached, 10) };
    }

    const count = await ctx.prisma.notification.count({
      where: {
        userId: ctx.session.user.id,
        isRead: false,
        isArchived: false,
      },
    });

    await ctx.redis.setex(cacheKey, 60, count.toString());
    return { count };
  }),

  // Mark single as read
  markAsRead: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const notification = await ctx.prisma.notification.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
      });

      if (!notification) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const updated = await ctx.prisma.notification.update({
        where: { id: input.id },
        data: { isRead: true, readAt: new Date() },
      });

      // Invalidate cache
      await ctx.redis.del(`unread:${ctx.session.user.id}`);

      return updated;
    }),

  // Batch mark as read
  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    const result = await ctx.prisma.notification.updateMany({
      where: {
        userId: ctx.session.user.id,
        isRead: false,
      },
      data: { isRead: true, readAt: new Date() },
    });

    await ctx.redis.del(`unread:${ctx.session.user.id}`);

    return { updated: result.count };
  }),

  // Archive notification
  archive: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const notification = await ctx.prisma.notification.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
      });

      if (!notification) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return ctx.prisma.notification.update({
        where: { id: input.id },
        data: { isArchived: true, archivedAt: new Date() },
      });
    }),

  // Batch archive
  batchArchive: protectedProcedure
    .input(z.object({ ids: z.array(z.string()).min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.notification.updateMany({
        where: {
          id: { in: input.ids },
          userId: ctx.session.user.id,
        },
        data: { isArchived: true, archivedAt: new Date() },
      });

      return { archived: result.count };
    }),

  // Get single notification detail
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const notification = await ctx.prisma.notification.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
        include: {
          channel: true,
          deliveryLogs: { orderBy: { createdAt: "desc" } },
        },
      });

      if (!notification) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return notification;
    }),

  // Admin: create notification for a user
  create: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        type: z.enum(["SYSTEM", "ALERT", "MESSAGE", "TASK", "REMINDER", "UPDATE"]),
        priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
        title: z.string().min(1).max(255),
        body: z.string().min(1).max(5000),
        channelId: z.string().optional(),
        metadata: z.record(z.unknown()).optional(),
        expiresAt: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const notification = await ctx.prisma.notification.create({
        data: {
          userId: input.userId,
          type: input.type,
          priority: input.priority,
          title: input.title,
          body: input.body,
          channelId: input.channelId,
          metadata: input.metadata as any,
          expiresAt: input.expiresAt,
        },
      });

      // Invalidate unread cache
      await ctx.redis.del(`unread:${input.userId}`);

      // Publish to Redis for WebSocket delivery
      await ctx.redis.publish(
        `notifications:${input.userId}`,
        JSON.stringify(notification)
      );

      return notification;
    }),

  // Admin: broadcast to all users in a channel
  broadcast: adminProcedure
    .input(
      z.object({
        channelId: z.string(),
        type: z.enum(["SYSTEM", "ALERT", "MESSAGE", "TASK", "REMINDER", "UPDATE"]),
        priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
        title: z.string().min(1).max(255),
        body: z.string().min(1).max(5000),
        metadata: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const subscriptions = await ctx.prisma.channelSubscription.findMany({
        where: { channelId: input.channelId },
        select: { userId: true },
      });

      const notifications = await ctx.prisma.notification.createMany({
        data: subscriptions.map((sub) => ({
          userId: sub.userId,
          channelId: input.channelId,
          type: input.type,
          priority: input.priority,
          title: input.title,
          body: input.body,
          metadata: input.metadata as any,
        })),
      });

      // Invalidate all subscriber caches
      const pipeline = ctx.redis.pipeline();
      for (const sub of subscriptions) {
        pipeline.del(`unread:${sub.userId}`);
      }
      await pipeline.exec();

      return { sent: notifications.count };
    }),

  // Stats for dashboard
  stats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const [total, unread, byType, byPriority] = await Promise.all([
      ctx.prisma.notification.count({
        where: { userId, isArchived: false },
      }),
      ctx.prisma.notification.count({
        where: { userId, isRead: false, isArchived: false },
      }),
      ctx.prisma.notification.groupBy({
        by: ["type"],
        where: { userId, isArchived: false },
        _count: true,
      }),
      ctx.prisma.notification.groupBy({
        by: ["priority"],
        where: { userId, isArchived: false, isRead: false },
        _count: true,
      }),
    ]);

    return {
      total,
      unread,
      byType: byType.map((t) => ({ type: t.type, count: t._count })),
      byPriority: byPriority.map((p) => ({
        priority: p.priority,
        count: p._count,
      })),
    };
  }),
});
