import type { components } from "@saas/api-client";
import { cache } from "react";
import { createServerApiContext } from "./server-api-context";

export type OrganizationSettings =
  | {
      available: true;
      value: components["schemas"]["OrganizationDto"];
    }
  | { available: false };

export const getOrganizationSettings = cache(
  async (
    token: string,
    organizationId: string,
  ): Promise<OrganizationSettings> => {
    try {
      const { client, correlatedHeaders } = await createServerApiContext();
      const { data } = await client.GET(
        "/v1/organizations/{organizationId}/settings",
        {
          cache: "no-store",
          headers: {
            ...correlatedHeaders,
            authorization: `Bearer ${token}`,
          },
          params: { path: { organizationId } },
          signal: AbortSignal.timeout(3_000),
        },
      );

      return data ? { available: true, value: data } : { available: false };
    } catch {
      return { available: false };
    }
  },
);
