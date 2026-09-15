import { headers } from "next/headers";
import { CORRELATION_ID_HEADER } from "@saas/tooling-config/http";
import { getWebEnvironment } from "../../../environment";
import { logWebOperation } from "../../../operational-log";

export async function GET() {
  const requestHeaders = await headers();
  const correlationId = requestHeaders.get(CORRELATION_ID_HEADER) ?? "unknown";
  const environment = getWebEnvironment();
  const localTelemetryDegraded = [
    environment.telemetry.posthog.status,
    environment.telemetry.sentry.status,
  ].includes("misconfigured");
  let status: "ready" | "degraded" | "unready" = "unready";

  try {
    const apiResponse = await fetch(new URL("/v1/ready", environment.apiUrl), {
      cache: "no-store",
      headers: { [CORRELATION_ID_HEADER]: correlationId },
      signal: AbortSignal.timeout(2_000),
    });
    const apiReadiness = (await apiResponse.json()) as { status?: unknown };

    if (apiResponse.ok && apiReadiness.status === "ready") {
      status = localTelemetryDegraded ? "degraded" : "ready";
    } else if (apiResponse.ok && apiReadiness.status === "degraded") {
      status = "degraded";
    }
  } catch {
    status = "unready";
  }

  const statusCode = status === "unready" ? 503 : 200;
  logWebOperation(environment, {
    event: "request.completed",
    correlationId,
    path: "/api/ready",
    statusCode,
    outcome:
      status === "ready"
        ? "success"
        : status === "degraded"
          ? "degraded"
          : "error",
  });

  return Response.json(
    {
      service: "web",
      status,
      dependencies: [
        {
          name: "api",
          critical: true,
          status: status === "unready" ? "down" : "up",
        },
        {
          name: "posthog",
          critical: false,
          status: environment.telemetry.posthog.status,
        },
        {
          name: "sentry",
          critical: false,
          status: environment.telemetry.sentry.status,
        },
      ],
    },
    { status: statusCode },
  );
}
