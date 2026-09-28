"use client";

import { useAuth } from "@clerk/nextjs";
import { createApiClient } from "@saas/api-client";
import { Button } from "@saas/ui";
import { useRef, useState } from "react";
import type { SupportedLocale } from "../../../../organization-localization";

type PortalState = "idle" | "pending" | "unavailable" | "unauthorized";

export function BillingPortalButton({
  apiUrl,
  canManage,
  locale,
  organizationId,
}: {
  apiUrl: string;
  canManage: boolean;
  locale: SupportedLocale;
  organizationId: string;
}) {
  const copy =
    locale === "pt-BR"
      ? {
          loading: "Abrindo o portal do cliente",
          manage: "Gerenciar assinatura",
          restricted: "Somente um proprietário pode abrir o portal do cliente.",
          unavailable: "O portal do cliente está indisponível no momento.",
        }
      : {
          loading: "Opening Customer Portal",
          manage: "Manage Subscription",
          restricted: "Only an Owner can open Customer Portal.",
          unavailable: "Customer Portal is currently unavailable.",
        };
  const { getToken } = useAuth();
  const idempotencyKey = useRef<string | null>(null);
  const [state, setState] = useState<PortalState>("idle");

  if (!canManage || state === "unauthorized") {
    return <p data-testid="billing-portal-unauthorized">{copy.restricted}</p>;
  }

  async function openPortal() {
    setState("pending");
    try {
      const token = await getToken();
      if (!token) throw new Error("Authentication is required.");
      const returnUrl = new URL(window.location.href);
      returnUrl.hash = "billing";
      idempotencyKey.current ??= crypto.randomUUID();
      const { data, response } = await createApiClient(apiUrl).POST(
        "/v1/organizations/{organizationId}/billing/portal-sessions",
        {
          body: { returnUrl: returnUrl.toString() },
          headers: { authorization: `Bearer ${token}` },
          params: {
            header: { "Idempotency-Key": idempotencyKey.current },
            path: { organizationId },
          },
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
        loadingLabel={copy.loading}
        onClick={() => void openPortal()}
        type="button"
      >
        {copy.manage}
      </Button>
      {state === "unavailable" ? (
        <p className="mt-2 text-sm text-muted" role="status">
          {copy.unavailable}
        </p>
      ) : null}
    </div>
  );
}
