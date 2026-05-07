import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function createRedisClient(): Redis {
  const url = process.env.REDIS_URL || "redis://localhost:6379";

  const client = new Redis(url, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    lazyConnect: true,
  });

  client.on("error", (err) => {
    console.error("[Redis] Connection error:", err.message);
  });

  client.on("connect", () => {
    console.log("[Redis] Connected");
  });

  return client;
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

// Separate client for BullMQ (requires dedicated connection)
export function createBullMQConnection(): Redis {
  const url = process.env.REDIS_URL || "redis://localhost:6379";
  return new Redis(url, { maxRetriesPerRequest: null });
}
