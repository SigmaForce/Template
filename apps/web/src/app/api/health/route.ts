import { headers } from "next/headers";
import { CORRELATION_ID_HEADER } from "@saas/tooling-config/http";
import { getWebEnvironment } from "../../../environment";
import { logWebOperation } from "../../../operational-log";

export async function GET() {
  const requestHeaders = await headers();
  const correlationId = requestHeaders.get(CORRELATION_ID_HEADER) ?? "unknown";
  const environment = getWebEnvironment();

  logWebOperation(environment, {
    event: "request.completed",
    correlationId,
    path: "/api/health",
    statusCode: 200,
    outcome: "success",
  });

  return Response.json({ service: "web", status: "healthy" });
}
