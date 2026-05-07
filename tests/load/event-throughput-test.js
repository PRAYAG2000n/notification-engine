import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";

const eventsPublished = new Counter("events_published");
const eventLatency = new Trend("event_publish_latency_ms");
const successRate = new Rate("event_success_rate");

export const options = {
  scenarios: {
    sustained_throughput: {
      executor: "constant-arrival-rate",
      rate: 175,              // 175 events/sec = 10,500/min
      timeUnit: "1s",
      duration: "2m",
      preAllocatedVUs: 50,
      maxVUs: 200,
    },
  },
  thresholds: {
    event_publish_latency_ms: ["p(95)<200"],
    event_success_rate: ["rate>0.95"],
    events_published: ["count>15000"],
  },
};

const API_URL = __ENV.API_URL || "http://localhost:3000";

const notificationTypes = ["SYSTEM", "ALERT", "MESSAGE", "UPDATE", "REMINDER"];
const priorities = ["LOW", "NORMAL", "HIGH", "URGENT"];

export default function () {
  const payload = JSON.stringify({
    title: `Load test notification ${Date.now()}`,
    body: `Automated benchmark event from VU ${__VU}, iter ${__ITER}`,
    type: notificationTypes[Math.floor(Math.random() * notificationTypes.length)],
    priority: priorities[Math.floor(Math.random() * priorities.length)],
    userId: "demo-user-id",
    channelId: "in-app",
    metadata: {
      source: "k6-load-test",
      vu: __VU,
      iter: __ITER,
    },
  });

  const params = {
    headers: {
      "Content-Type": "application/json",
    },
    timeout: "10s",
  };

  const start = Date.now();
  const res = http.post(`${API_URL}/api/events/publish`, payload, params);
  const duration = Date.now() - start;

  eventLatency.add(duration);

  const success = res.status === 200 || res.status === 201;
  successRate.add(success);

  if (success) {
    eventsPublished.add(1);
  }

  check(res, {
    "status is 200 or 201": (r) => r.status === 200 || r.status === 201,
    "response time < 500ms": (r) => r.timings.duration < 500,
  });
}

export function handleSummary(data) {
  const totalEvents = data.metrics.events_published
    ? data.metrics.events_published.values.count
    : 0;
  const durationSec = 120; // 2 minutes
  const eventsPerMin = Math.round((totalEvents / durationSec) * 60);

  const summary = {
    totalEvents,
    eventsPerMinute: eventsPerMin,
    latency: {
      avg: data.metrics.event_publish_latency_ms
        ? data.metrics.event_publish_latency_ms.values.avg.toFixed(2)
        : "N/A",
      p95: data.metrics.event_publish_latency_ms
        ? data.metrics.event_publish_latency_ms.values["p(95)"].toFixed(2)
        : "N/A",
      p99: data.metrics.event_publish_latency_ms
        ? data.metrics.event_publish_latency_ms.values["p(99)"] ? data.metrics.event_publish_latency_ms.values["p(99)"].toFixed(2) : "N/A"
        : "N/A",
    },
    successRate: data.metrics.event_success_rate
      ? (data.metrics.event_success_rate.values.rate * 100).toFixed(2) + "%"
      : "N/A",
  };

  console.log("\n========== THROUGHPUT TEST RESULTS ==========");
  console.log(`Total Events Published: ${summary.totalEvents}`);
  console.log(`Events Per Minute: ${summary.eventsPerMinute}`);
  console.log(`Latency (avg/p95/p99): ${summary.latency.avg}ms / ${summary.latency.p95}ms / ${summary.latency.p99}ms`);
  console.log(`Success Rate: ${summary.successRate}`);
  console.log("==============================================\n");

  return {
    "throughput-results.json": JSON.stringify(summary, null, 2),
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };
}
