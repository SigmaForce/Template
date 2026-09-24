"use client";

import { useAuth } from "@clerk/nextjs";
import { createApiClient } from "@saas/api-client";
import { Button } from "@saas/ui";
import { useState } from "react";

type PortalState = "idle" | "pending" | "unavailable" | "unauthorized";

export function BillingPortalButton({
  apiUrl,
  canManage,
  organizationId,
}: {
  apiUrl: string;
  canManage: boolean;
  organizationId: string;
}) {
  const { getToken } = useAuth();
  const [state, setState] = useState<PortalState>("idle");

  if (!canManage || state === "unauthorized") {
    return (
      <p data-testid="billing-portal-unauthorized">
        Only an Owner can open Customer Portal.
      </p>
    );
  }

  async function openPortal() {
    setState("pending");
    try {
      const token = await getToken();
      if (!token) throw new Error("Authentication is required.");
      const returnUrl = new URL(window.location.href);
      returnUrl.hash = "billing";
      const { data, response } = await createApiClient(apiUrl).POST(
        "/v1/organizations/{organizationId}/billing/portal-sessions",
        {
          body: { returnUrl: returnUrl.toString() },
          headers: { authorization: `Bearer ${token}` },
          params: { path: { organizationId } },
        },
      );
      if (!data) {
        setState(response.status === 403 ? "unauthorized" : "unavailable");
        return;
      }
      window.location.assign(data.portalUrl);
    } catch {
      setState("unavailable");
    }
  }

  return (
    <div className="mt-4">
      <Button
        loading={state === "pending"}
        loadingLabel="Opening Customer Portal"
        onClick={() => void openPortal()}
        type="button"
      >
        Manage Subscription
      </Button>
      {state === "unavailable" ? (
        <p className="mt-2 text-sm text-muted" role="status">
          Customer Portal is currently unavailable.
        </p>
      ) : null}
    </div>
  );
}
