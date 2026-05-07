import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, adminProcedure } from "@/server/trpc";

export const channelRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const channels = await ctx.prisma.channel.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { subscriptions: true } },
        subscriptions: {
          where: { userId: ctx.session.user.id },
          select: { id: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return channels.map((ch) => ({
      id: ch.id,
      name: ch.name,
      description: ch.description,
      subscriberCount: ch._count.subscriptions,
      isSubscribed: ch.subscriptions.length > 0,
    }));
  }),

  subscribe: protectedProcedure
    .input(z.object({ channelId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const channel = await ctx.prisma.channel.findUnique({
        where: { id: input.channelId },
      });

      if (!channel || !channel.isActive) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return ctx.prisma.channelSubscription.upsert({
        where: {
          userId_channelId: {
            userId: ctx.session.user.id,
            channelId: input.channelId,
          },
        },
        update: {},
        create: {
          userId: ctx.session.user.id,
          channelId: input.channelId,
        },
      });
    }),

  unsubscribe: protectedProcedure
    .input(z.object({ channelId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.channelSubscription.deleteMany({
        where: {
          userId: ctx.session.user.id,
          channelId: input.channelId,
        },
      });
    }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.channel.create({
        data: {
          name: input.name,
          description: input.description,
        },
      });
    }),
});
