import { router } from "@/server/trpc";
import { notificationRouter } from "@/server/routers/notification";
import { preferenceRouter } from "@/server/routers/preference";
import { channelRouter } from "@/server/routers/channel";

export const appRouter = router({
  notification: notificationRouter,
  preference: preferenceRouter,
  channel: channelRouter,
});

export type AppRouter = typeof appRouter;
