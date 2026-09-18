import { createApiClient } from "@saas/api-client";
import { CORRELATION_ID_HEADER } from "@saas/tooling-config/http";
import { headers } from "next/headers";
import { getWebEnvironment } from "./environment";

export async function createServerApiContext() {
  const environment = getWebEnvironment();
  const requestHeaders = await headers();
  const correlationId = requestHeaders.get(CORRELATION_ID_HEADER) ?? "unknown";

  return {
    client: createApiClient(environment.apiUrl.toString()),
    correlatedHeaders: { [CORRELATION_ID_HEADER]: correlationId },
    correlationId,
    environment,
  };
}
