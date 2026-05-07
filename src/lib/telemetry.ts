import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { Resource } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import { logger } from "@/lib/logger";

export function initTelemetry() {
  const sdk = new NodeSDK({
    resource: new Resource({
      [ATTR_SERVICE_NAME]: "notification-engine",
      [ATTR_SERVICE_VERSION]: "1.0.0",
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-fs": { enabled: false },
        "@opentelemetry/instrumentation-http": {
          ignoreIncomingRequestHook: (req) => {
            // Skip health check noise
            return req.url === "/api/health";
          },
        },
      }),
    ],
  });

  sdk.start();
  logger.info("OpenTelemetry initialized");

  process.on("SIGTERM", () => {
    sdk.shutdown().then(
      () => logger.info("OpenTelemetry shut down"),
      (err) => logger.error({ err }, "OpenTelemetry shutdown error")
    );
  });
}
