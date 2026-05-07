import { Queue, Worker, type Job } from "bullmq";
import { createBullMQConnection } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const connection = createBullMQConnection();

// ─── Queue Definitions ─────────────────────────────────────────

export const notificationQueue = new Queue("notifications", { connection });
export const digestQueue = new Queue("digest", { connection });
export const cleanupQueue = new Queue("cleanup", { connection });

// ─── Job Types ─────────────────────────────────────────────────

interface DeliverJobData {
  notificationId: string;
  userId: string;
  channels: ("IN_APP" | "EMAIL" | "PUSH" | "WEBHOOK")[];
}

interface DigestJobData {
  userId: string;
  frequency: "HOURLY" | "DAILY" | "WEEKLY";
}

interface CleanupJobData {
  olderThanDays: number;
}

// ─── Workers ───────────────────────────────────────────────────

export function startWorkers() {
  // Notification delivery worker
  const deliveryWorker = new Worker<DeliverJobData>(
    "notifications",
    async (job: Job<DeliverJobData>) => {
      const { notificationId, userId, channels } = job.data;
      logger.info({ notificationId, userId, channels }, "Processing delivery");

      for (const channel of channels) {
        try {
          await prisma.deliveryLog.create({
            data: {
              notificationId,
              userId,
              channel,
              status: "DELIVERED",
              deliveredAt: new Date(),
            },
          });
        } catch (err) {
          logger.error({ err, channel, notificationId }, "Delivery failed");

          await prisma.deliveryLog.create({
            data: {
              notificationId,
              userId,
              channel,
              status: "FAILED",
              errorMessage: err instanceof Error ? err.message : "Unknown error",
            },
          });

          throw err; // triggers retry
        }
      }

      await prisma.jobRecord.update({
        where: { jobId: job.id! },
        data: { status: "completed", completedAt: new Date() },
      });
    },
    {
      connection,
      concurrency: 10,
      limiter: { max: 100, duration: 1000 },
    }
  );

  // Digest worker: aggregates notifications into a single summary
  const digestWorker = new Worker<DigestJobData>(
    "digest",
    async (job: Job<DigestJobData>) => {
      const { userId, frequency } = job.data;
      logger.info({ userId, frequency }, "Building digest");

      const hoursMap = { HOURLY: 1, DAILY: 24, WEEKLY: 168 };
      const since = new Date(
        Date.now() - hoursMap[frequency] * 60 * 60 * 1000
      );

      const unread = await prisma.notification.findMany({
        where: {
          userId,
          isRead: false,
          createdAt: { gte: since },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      if (unread.length === 0) {
        logger.info({ userId }, "No unread notifications for digest");
        return;
      }

      // Create a digest notification summarizing unread count
      await prisma.notification.create({
        data: {
          userId,
          type: "SYSTEM",
          priority: "LOW",
          title: `${frequency.toLowerCase()} digest: ${unread.length} unread`,
          body: `You have ${unread.length} unread notifications. Top: ${unread
            .slice(0, 3)
            .map((n) => n.title)
            .join(", ")}`,
          metadata: {
            digestFrequency: frequency,
            notificationCount: unread.length,
            topNotificationIds: unread.slice(0, 5).map((n) => n.id),
          },
        },
      });
    },
    { connection, concurrency: 5 }
  );

  // Cleanup worker: archives expired and old notifications
  const cleanupWorker = new Worker<CleanupJobData>(
    "cleanup",
    async (job: Job<CleanupJobData>) => {
      const { olderThanDays } = job.data;
      const cutoff = new Date(
        Date.now() - olderThanDays * 24 * 60 * 60 * 1000
      );

      // Archive expired notifications
      const expired = await prisma.notification.updateMany({
        where: {
          expiresAt: { lte: new Date() },
          isArchived: false,
        },
        data: { isArchived: true, archivedAt: new Date() },
      });

      // Archive old read notifications
      const old = await prisma.notification.updateMany({
        where: {
          createdAt: { lte: cutoff },
          isRead: true,
          isArchived: false,
        },
        data: { isArchived: true, archivedAt: new Date() },
      });

      logger.info(
        { expired: expired.count, old: old.count },
        "Cleanup complete"
      );
    },
    { connection, concurrency: 1 }
  );

  // Error handlers
  [deliveryWorker, digestWorker, cleanupWorker].forEach((worker) => {
    worker.on("failed", (job, err) => {
      logger.error(
        { jobId: job?.id, queue: worker.name, err },
        "Job failed"
      );
    });
  });

  logger.info("All workers started");
}

// ─── Schedule Recurring Jobs ──────────────────────────────────

export async function scheduleRecurringJobs() {
  // Cleanup runs daily at 3am
  await cleanupQueue.add(
    "daily-cleanup",
    { olderThanDays: 30 },
    {
      repeat: { pattern: "0 3 * * *" },
      removeOnComplete: 10,
      removeOnFail: 5,
    }
  );

  logger.info("Recurring jobs scheduled");
}
