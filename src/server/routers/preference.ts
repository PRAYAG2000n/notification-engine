import { z } from "zod";
import { router, protectedProcedure } from "@/server/trpc";

export const preferenceRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    let prefs = await ctx.prisma.notificationPreference.findUnique({
      where: { userId: ctx.session.user.id },
    });

    if (!prefs) {
      prefs = await ctx.prisma.notificationPreference.create({
        data: { userId: ctx.session.user.id },
      });
    }

    return prefs;
  }),

  update: protectedProcedure
    .input(
      z.object({
        emailEnabled: z.boolean().optional(),
        pushEnabled: z.boolean().optional(),
        inAppEnabled: z.boolean().optional(),
        digestEnabled: z.boolean().optional(),
        digestFrequency: z.enum(["HOURLY", "DAILY", "WEEKLY"]).optional(),
        quietHoursStart: z.string().nullable().optional(),
        quietHoursEnd: z.string().nullable().optional(),
        mutedTypes: z
          .array(
            z.enum([
              "SYSTEM",
              "ALERT",
              "MESSAGE",
              "TASK",
              "REMINDER",
              "UPDATE",
            ])
          )
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.notificationPreference.upsert({
        where: { userId: ctx.session.user.id },
        update: input,
        create: {
          userId: ctx.session.user.id,
          ...input,
        },
      });
    }),
});
