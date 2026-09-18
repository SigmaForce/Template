import type { Instrumentation } from "next";
import { CORRELATION_ID_HEADER } from "@saas/tooling-config/http";
import { getWebEnvironment } from "./environment";
import { logWebOperation } from "./operational-log";

export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    getWebEnvironment();
  }
}

export const onRequestError: Instrumentation.onRequestError = async (
  _error,
  request,
) => {
  const environment = getWebEnvironment();
  const correlationHeader = request.headers[CORRELATION_ID_HEADER];
  const correlationId = Array.isArray(correlationHeader)
    ? correlationHeader[0]
    : (correlationHeader ?? "unknown");

  logWebOperation(environment, {
    event: "request.failed",
    correlationId,
    path: request.path.split("?", 1)[0] ?? "unknown",
    statusCode: 500,
    outcome: "error",
  });
};
