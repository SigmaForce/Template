import type { components } from "@saas/api-client";
import { brand } from "@saas/ui";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { logWebOperation } from "../../../../operational-log";
import { createServerApiContext } from "../../../../server-api-context";

type Money = components["schemas"]["MoneyDto"];

type ApiAvailability =
  | {
      available: true;
      example: {
        name: string;
        price: Money;
      };
    }
  | { available: false };

type AuthenticatedIdentity =
  { available: true; id: string } | { available: false };

type ActiveOrganizationContext =
  | {
      available: true;
      organization: components["schemas"]["ActiveOrganizationDto"];
    }
  | { available: false };

async function getAuthenticatedIdentity(
  token: string,
): Promise<AuthenticatedIdentity> {
  try {
    const { client, correlatedHeaders } = await createServerApiContext();
    const { data } = await client.GET("/v1/auth/me", {
      cache: "no-store",
      headers: {
        ...correlatedHeaders,
        authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(3_000),
    });

    if (!data) return { available: false };

    return { available: true, id: data.id };
  } catch {
    return { available: false };
  }
}

async function getActiveOrganization(
  token: string,
): Promise<ActiveOrganizationContext> {
  try {
    const { client, correlatedHeaders } = await createServerApiContext();
    const { data } = await client.GET("/v1/organizations/active", {
      cache: "no-store",
      headers: {
        ...correlatedHeaders,
        authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(3_000),
    });

    return data
      ? { available: true, organization: data }
      : { available: false };
  } catch {
    return { available: false };
  }
}

async function getApiAvailability(): Promise<ApiAvailability> {
  const { client, correlatedHeaders, correlationId, environment } =
    await createServerApiContext();

  try {
    const { data } = await client.GET("/v1/contract-examples", {
      cache: "no-store",
      headers: correlatedHeaders,
      params: { query: { currency: "BRL", limit: 1 } },
      signal: AbortSignal.timeout(3_000),
    });

    const example = data?.items[0];

    if (!example) {
      logWebOperation(environment, {
        event: "api.contract-example.completed",
        correlationId,
        path: "/v1/contract-examples",
        statusCode: 502,
        outcome: "error",
      });
      return { available: false };
    }

    logWebOperation(environment, {
      event: "api.contract-example.completed",
      correlationId,
      path: "/v1/contract-examples",
      statusCode: 200,
      outcome: "success",
    });
    return { available: true, example };
  } catch {
    logWebOperation(environment, {
      event: "api.contract-example.completed",
      correlationId,
      path: "/v1/contract-examples",
      statusCode: 502,
      outcome: "error",
    });
    return { available: false };
  }
}

function formatMoney({ amountMinor, currency }: Money) {
  const negative = amountMinor.startsWith("-");
  const digits = (negative ? amountMinor.slice(1) : amountMinor).padStart(
    3,
    "0",
  );
  const whole = digits.slice(0, -2);
  const fraction = digits.slice(-2);

  return `${currency} ${negative ? "-" : ""}${whole}.${fraction}`;
}

export default async function Home({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [{ slug }, session] = await Promise.all([params, auth()]);
  const { getToken, orgSlug } = session;
  if (orgSlug !== slug) redirect("/");

  const token = await getToken();
  if (!token) redirect("/");

  const [api, identity, activeOrganization] = await Promise.all([
    getApiAvailability(),
    getAuthenticatedIdentity(token),
    getActiveOrganization(token),
  ]);
  if (
    activeOrganization.available &&
    activeOrganization.organization.slug !== slug
  ) {
    redirect(`/organizations/${activeOrganization.organization.slug}`);
  }
  const activePermissions = activeOrganization.available
    ? activeOrganization.organization.permissions
    : [];
  const canManageBilling = activePermissions.includes("billing:manage");
  const canUpdateOrganizationSettings = activePermissions.includes(
    "organization:settings:update",
  );

  return (
    <div className="dashboard-page" id="overview">
      <header className="dashboard-intro">
        <div>
          <p className="eyebrow">Monday · September 15</p>
          <h1 id="page-title">Good morning, Alex.</h1>
          <p className="lede">
            Here is what deserves your attention across {brand.organizationName}{" "}
            today.
          </p>
        </div>
        <a className="primary-action" href="#activity">
          Review activity
          <span aria-hidden="true">→</span>
        </a>
      </header>

      <div className="dashboard-grid">
        <div className="dashboard-main-column">
          <section className="spotlight-card" aria-labelledby="focus-title">
            <div>
              <p className="eyebrow">This week</p>
              <h2 id="focus-title">Momentum is building.</h2>
              <p>
                Eighteen priorities moved forward and your team closed two
                long-running decisions.
              </p>
            </div>
            <div
              className="momentum-score"
              aria-label="84 percent weekly momentum"
            >
              <strong>84%</strong>
              <span>momentum</span>
            </div>
          </section>

          <section
            className="activity-card"
            id="activity"
            aria-labelledby="activity-title"
          >
            <div className="section-heading">
              <div>
                <p className="eyebrow">Latest signals</p>
                <h2 id="activity-title">Team activity</h2>
              </div>
              <a href="#activity">View all</a>
            </div>
            <ol className="activity-list">
              <li>
                <span className="activity-mark" aria-hidden="true">
                  LM
                </span>
                <div>
                  <strong>Launch milestone approved</strong>
                  <p>Leadership · 12 minutes ago</p>
                </div>
                <span className="activity-tag">Decision</span>
              </li>
              <li>
                <span className="activity-mark" aria-hidden="true">
                  PS
                </span>
                <div>
                  <strong>Product scorecard shared</strong>
                  <p>Product · 48 minutes ago</p>
                </div>
                <span className="activity-tag">Update</span>
              </li>
              <li>
                <span className="activity-mark" aria-hidden="true">
                  CS
                </span>
                <div>
                  <strong>Customer review completed</strong>
                  <p>Success · 2 hours ago</p>
                </div>
                <span className="activity-tag">Insight</span>
              </li>
            </ol>
          </section>
        </div>

        <aside
          className="dashboard-side-column"
          aria-label="Organization summary"
        >
          <section
            className="status-card"
            data-available={identity.available}
            role="status"
          >
            <div className="status-heading">
              <span className="status-dot" aria-hidden="true" />
              <p>Authentication</p>
            </div>
            <div>
              <h2>
                {identity.available ? "Verified User" : "Identity unavailable"}
              </h2>
              <p>
                {identity.available
                  ? "The generated client reached the protected API with a verified session token."
                  : "The protected API could not verify this session."}
              </p>
              {identity.available ? (
                <>
                  <div className="contract-example">
                    <span>User</span>
                    <span data-testid="authenticated-user-id">
                      {identity.id}
                    </span>
                  </div>
                  {activeOrganization.available ? (
                    <div className="contract-example">
                      <span>Active Organization</span>
                      <span data-testid="active-organization-slug">
                        {activeOrganization.organization.slug}
                      </span>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          </section>

          <section
            className="status-card"
            data-available={api.available}
            role="status"
          >
            <div className="status-heading">
              <span className="status-dot" aria-hidden="true" />
              <p>System status</p>
            </div>
            <div>
              <h2>
                {api.available
                  ? "API contract is available"
                  : "API contract is unavailable"}
              </h2>
              <p>
                {api.available
                  ? "The generated client reached the versioned backend contract."
                  : "Start the API or check NEXT_PUBLIC_API_URL, then try again."}
              </p>
              {api.available ? (
                <div className="contract-example">
                  <span data-testid="contract-example-name">
                    {api.example.name}
                  </span>
                  <span data-testid="contract-example-price">
                    {formatMoney(api.example.price)}
                  </span>
                </div>
              ) : null}
            </div>
          </section>

          <section
            className="compact-card"
            id="billing"
            aria-labelledby="billing-title"
          >
            <p className="eyebrow">Billing</p>
            <h2 id="billing-title">Launch plan</h2>
            <p>Next renewal on October 15 · 8 active seats</p>
            {canManageBilling ? (
              <a href="#billing">
                Manage plan <span aria-hidden="true">↗</span>
              </a>
            ) : (
              <p data-testid="billing-permission-required">
                An Owner can manage this plan.
              </p>
            )}
          </section>

          <section
            className="compact-card"
            id="settings"
            aria-labelledby="settings-title"
          >
            <p className="eyebrow">Organization</p>
            <h2 id="settings-title">Make it yours</h2>
            <p>Brand, semantic tokens and navigation are ready to customize.</p>
            {canUpdateOrganizationSettings ? (
              <a href="#settings">
                Open settings <span aria-hidden="true">↗</span>
              </a>
            ) : (
              <p data-testid="settings-permission-required">
                You can view these settings, but cannot change them.
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
