import type { WebEnvironment } from "../../../scripts/environment-core.mjs";
import { sanitizeForLog } from "@saas/tooling-config/redaction";

interface WebOperation {
  event: string;
  correlationId: string;
  path: string;
  statusCode: number;
  outcome: "success" | "degraded" | "error";
}

export function logWebOperation(
  environment: WebEnvironment,
  operation: WebOperation,
) {
  console.log(
    JSON.stringify(
      sanitizeForLog({
        timestamp: new Date().toISOString(),
        level: operation.outcome === "error" ? "error" : "info",
        service: "web",
        environment: environment.environment,
        ...operation,
      }),
    ),
  );
}
