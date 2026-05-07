import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Trend, Rate } from "k6/metrics";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";

// Custom metrics
const messagesReceived = new Counter("ws_messages_received");
const messageLatency = new Trend("ws_message_latency_ms");
const connectionTime = new Trend("ws_connection_time_ms");
const connectionSuccess = new Rate("ws_connection_success");

export const options = {
  stages: [
    { duration: "30s", target: 50 },
    { duration: "30s", target: 100 },
    { duration: "30s", target: 200 },
    { duration: "60s", target: 200 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    ws_connection_time_ms: ["p(95)<500"],
    ws_connection_success: ["rate>0.90"],
    ws_messages_received: ["count>0"],
    checks: ["rate>0.90"],
  },
};

const BASE_URL = __ENV.WS_URL || "http://localhost:3001";

export default function () {
  const userId = `loadtest-user-${__VU}`;
  const connectStart = Date.now();

  // Step 1: Socket.io handshake (EIO protocol)
  // This mimics what a Socket.io client does: GET with EIO=4&transport=polling
  const handshakeRes = http.get(
    `${BASE_URL}/socket.io/?EIO=4&transport=polling`,
    {
      headers: { "X-User-Id": userId },
      timeout: "10s",
    }
  );

  const connectEnd = Date.now();
  connectionTime.add(connectEnd - connectStart);

  // Socket.io polling response starts with a length prefix like "0{"sid":"...","upgrades":["websocket"],...}"
  const handshakeOk =
    handshakeRes.status === 200 && handshakeRes.body && handshakeRes.body.includes("sid");

  connectionSuccess.add(handshakeOk ? 1 : 0);

  check(handshakeRes, {
    "handshake status 200": (r) => r.status === 200,
    "handshake contains sid": (r) => r.body && r.body.includes("sid"),
  });

  if (!handshakeOk) {
    sleep(0.5);
    return;
  }

  // Extract session ID from response
  // Response format: "0{"sid":"xxxxx","upgrades":[...],"pingInterval":...,"pingTimeout":...}"
  let sid = "";
  try {
    const bodyStr = handshakeRes.body;
    // Find the JSON part (after the leading digit(s))
    const jsonStart = bodyStr.indexOf("{");
    if (jsonStart >= 0) {
      const jsonStr = bodyStr.substring(jsonStart);
      // Find the end of the first JSON object
      let depth = 0;
      let jsonEnd = jsonStart;
      for (let i = 0; i < jsonStr.length; i++) {
        if (jsonStr[i] === "{") depth++;
        if (jsonStr[i] === "}") depth--;
        if (depth === 0) {
          jsonEnd = i + 1;
          break;
        }
      }
      const parsed = JSON.parse(jsonStr.substring(0, jsonEnd));
      sid = parsed.sid;
    }
  } catch (e) {
    // Failed to parse, skip this iteration
    sleep(0.5);
    return;
  }

  if (!sid) {
    sleep(0.5);
    return;
  }

  // Step 2: Send auth message via polling POST
  const authPayload = `42["message",${JSON.stringify(
    JSON.stringify({ type: "auth", userId: userId })
  )}]`;

  const postRes = http.post(
    `${BASE_URL}/socket.io/?EIO=4&transport=polling&sid=${sid}`,
    authPayload,
    {
      headers: {
        "Content-Type": "text/plain;charset=UTF-8",
        "X-User-Id": userId,
      },
      timeout: "10s",
    }
  );

  check(postRes, {
    "auth post accepted": (r) => r.status === 200,
  });

  // Step 3: Poll for response messages
  const pollStart = Date.now();
  const pollRes = http.get(
    `${BASE_URL}/socket.io/?EIO=4&transport=polling&sid=${sid}`,
    {
      headers: { "X-User-Id": userId },
      timeout: "10s",
    }
  );

  if (pollRes.status === 200 && pollRes.body) {
    const pollEnd = Date.now();
    messageLatency.add(pollEnd - pollStart);

    // Count messages in the response
    // Socket.io sends messages like: 42["event",{...}]
    const body = pollRes.body;
    const messageMatches = body.match(/42\[/g);
    if (messageMatches) {
      messagesReceived.add(messageMatches.length);
    }

    // Also count the connected event which comes as part of namespace connect: 40
    if (body.includes("40") || body.includes("42")) {
      messagesReceived.add(1);
    }

    check(pollRes, {
      "poll returned data": (r) => r.body && r.body.length > 0,
    });
  }

  // Step 4: Send a ping-like message
  const pingPayload = `42["message",${JSON.stringify(
    JSON.stringify({
      type: "ping",
      timestamp: new Date().toISOString(),
    })
  )}]`;

  http.post(
    `${BASE_URL}/socket.io/?EIO=4&transport=polling&sid=${sid}`,
    pingPayload,
    {
      headers: {
        "Content-Type": "text/plain;charset=UTF-8",
      },
      timeout: "10s",
    }
  );

  // Step 5: One more poll to get pong response
  const pongPollRes = http.get(
    `${BASE_URL}/socket.io/?EIO=4&transport=polling&sid=${sid}`,
    { timeout: "10s" }
  );

  if (pongPollRes.status === 200 && pongPollRes.body) {
    const pongBody = pongPollRes.body;
    if (pongBody.includes("42")) {
      messagesReceived.add(1);
      const latency = Date.now() - pollStart;
      messageLatency.add(latency);
    }
  }

  sleep(0.5);
}

export function handleSummary(data) {
  const summary = {
    totalVUs: data.metrics.vus_max ? data.metrics.vus_max.values.max : 0,
    connectionTime: {
      avg: data.metrics.ws_connection_time_ms
        ? data.metrics.ws_connection_time_ms.values.avg.toFixed(2)
        : "N/A",
      p95: data.metrics.ws_connection_time_ms
        ? data.metrics.ws_connection_time_ms.values["p(95)"].toFixed(2)
        : "N/A",
    },
    messageLatency: {
      avg: data.metrics.ws_message_latency_ms
        ? data.metrics.ws_message_latency_ms.values.avg.toFixed(2)
        : "N/A",
      p95: data.metrics.ws_message_latency_ms
        ? data.metrics.ws_message_latency_ms.values["p(95)"].toFixed(2)
        : "N/A",
    },
    messagesReceived: data.metrics.ws_messages_received
      ? data.metrics.ws_messages_received.values.count
      : 0,
    connectionSuccessRate: data.metrics.ws_connection_success
      ? (data.metrics.ws_connection_success.values.rate * 100).toFixed(2) + "%"
      : "N/A",
    checksPassRate: data.metrics.checks
      ? (data.metrics.checks.values.rate * 100).toFixed(2) + "%"
      : "N/A",
  };

  console.log("\n========== WEBSOCKET LOAD TEST RESULTS ==========");
  console.log(`Peak Concurrent Users: ${summary.totalVUs}`);
  console.log(
    `Connection Time (avg/p95): ${summary.connectionTime.avg}ms / ${summary.connectionTime.p95}ms`
  );
  console.log(
    `Message Latency (avg/p95): ${summary.messageLatency.avg}ms / ${summary.messageLatency.p95}ms`
  );
  console.log(`Messages Received: ${summary.messagesReceived}`);
  console.log(`Connection Success Rate: ${summary.connectionSuccessRate}`);
  console.log(`Check Pass Rate: ${summary.checksPassRate}`);
  console.log("====================================================\n");

  return {
    "ws-load-results.json": JSON.stringify(summary, null, 2),
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };
}
