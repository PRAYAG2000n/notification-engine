import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create demo users
  const passwordHash = await bcrypt.hash("demo1234", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@notifyhub.dev" },
    update: {},
    create: {
      email: "admin@notifyhub.dev",
      name: "Admin User",
      passwordHash,
      role: "ADMIN",
      emailVerified: new Date(),
    },
  });

  const user = await prisma.user.upsert({
    where: { email: "demo@notifyhub.dev" },
    update: {},
    create: {
      email: "demo@notifyhub.dev",
      name: "Demo User",
      passwordHash,
      role: "USER",
      emailVerified: new Date(),
    },
  });

  // Create channels
  const channels = await Promise.all(
    [
      { name: "engineering", description: "Engineering team updates" },
      { name: "product", description: "Product announcements" },
      { name: "security", description: "Security alerts and advisories" },
      { name: "system", description: "System status and maintenance" },
    ].map((ch) =>
      prisma.channel.upsert({
        where: { name: ch.name },
        update: {},
        create: ch,
      })
    )
  );

  // Subscribe users to channels
  for (const channel of channels) {
    await prisma.channelSubscription.upsert({
      where: {
        userId_channelId: { userId: user.id, channelId: channel.id },
      },
      update: {},
      create: { userId: user.id, channelId: channel.id },
    });
  }

  // Create sample notifications
  const types = ["SYSTEM", "ALERT", "MESSAGE", "TASK", "REMINDER", "UPDATE"] as const;
  const priorities = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

  const sampleNotifications = [
    { title: "Deployment completed", body: "v2.4.1 deployed to production. All health checks passing.", type: "SYSTEM" as const, priority: "NORMAL" as const },
    { title: "CPU usage spike detected", body: "Production server us-east-1a hit 92% CPU for 5 minutes. Auto-scaling triggered.", type: "ALERT" as const, priority: "HIGH" as const },
    { title: "New comment on PR #347", body: "Alex left a review on your pull request: 'Looks good, one small nit on line 42.'", type: "MESSAGE" as const, priority: "NORMAL" as const },
    { title: "Sprint review due tomorrow", body: "Sprint 24 review meeting is scheduled for tomorrow at 10am EST.", type: "REMINDER" as const, priority: "NORMAL" as const },
    { title: "Database migration required", body: "Schema changes pending for the notifications table. Run migrations before next deploy.", type: "TASK" as const, priority: "HIGH" as const },
    { title: "Security patch available", body: "Critical CVE-2025-1234 patched in dependencies. Update package.json.", type: "ALERT" as const, priority: "URGENT" as const },
    { title: "New team member joined", body: "Jordan Kim joined the engineering team. Say hello in #general.", type: "UPDATE" as const, priority: "LOW" as const },
    { title: "API rate limit warning", body: "Your API key hit 80% of the hourly rate limit. Consider caching responses.", type: "ALERT" as const, priority: "HIGH" as const },
    { title: "Weekly digest available", body: "12 unread notifications from last week. Top channels: engineering, security.", type: "SYSTEM" as const, priority: "LOW" as const },
    { title: "Incident resolved: payment API", body: "Payment processing latency returned to normal. RCA in progress.", type: "SYSTEM" as const, priority: "NORMAL" as const },
  ];

  for (let i = 0; i < sampleNotifications.length; i++) {
    const n = sampleNotifications[i];
    await prisma.notification.create({
      data: {
        userId: user.id,
        channelId: channels[i % channels.length].id,
        type: n.type,
        priority: n.priority,
        title: n.title,
        body: n.body,
        isRead: i > 5, // first 6 are unread
        createdAt: new Date(Date.now() - i * 3600000), // stagger by 1 hour each
      },
    });
  }

  // Create preferences for the demo user
  await prisma.notificationPreference.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      emailEnabled: true,
      pushEnabled: true,
      inAppEnabled: true,
      digestEnabled: true,
      digestFrequency: "DAILY",
      quietHoursStart: "22:00",
      quietHoursEnd: "08:00",
    },
  });

  console.log("Seed complete.");
  console.log(`Admin: admin@notifyhub.dev / demo1234`);
  console.log(`User:  demo@notifyhub.dev / demo1234`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
