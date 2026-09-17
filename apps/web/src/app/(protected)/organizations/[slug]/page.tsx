import type { components } from "@saas/api-client";
import { brand, ForbiddenState } from "@saas/ui";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { logWebOperation } from "../../../../operational-log";
import { createServerApiContext } from "../../../../server-api-context";
import { getWebEnvironment } from "../../../../environment";
import { OrganizationInvitations } from "./organization-invitations";
import { OrganizationMemberships } from "./organization-memberships";

type Money = components["schemas"]["MoneyDto"];
type PermissionId =
  components["schemas"]["ActiveOrganizationDto"]["permissions"][number];

const permission = {
  billingManage: "billing:manage",
  organizationMembershipsManage: "organization:memberships:manage",
  organizationSettingsUpdate: "organization:settings:update",
} as const satisfies Record<string, PermissionId>;

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
  | { available: false; reason: "forbidden" | "unavailable" };

type OrganizationSettings =
  | {
      available: true;
      value: components["schemas"]["OrganizationDto"];
    }
  | { available: false };

async function updateOrganizationSettingsAction(
  organizationId: string,
  slug: string,
  formData: FormData,
) {
  "use server";

  const locale = formData.get("locale");
  const timeZone = formData.get("timeZone");
  if (
    (locale !== "en-US" && locale !== "pt-BR") ||
    (timeZone !== "America/Cuiaba" &&
      timeZone !== "America/Sao_Paulo" &&
      timeZone !== "UTC")
  ) {
    throw new Error("Invalid Organization settings.");
  }

  const session = await auth();
  if (session.orgId !== organizationId) {
    throw new Error("Active Organization changed. Reload and try again.");
  }
  const token = await session.getToken();
  if (!token) throw new Error("Authentication is required.");

  const { client, correlatedHeaders } = await createServerApiContext();
  const { error } = await client.PATCH(
    "/v1/organizations/{organizationId}/settings",
    {
      headers: {
        ...correlatedHeaders,
        authorization: `Bearer ${token}`,
      },
      params: { path: { organizationId } },
      body: { locale, timeZone },
    },
  );
  if (error) throw new Error("Organization settings could not be updated.");

  revalidatePath(`/organizations/${slug}`);
}

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
    const { data, response } = await client.GET("/v1/organizations/active", {
      cache: "no-store",
      headers: {
        ...correlatedHeaders,
        authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(3_000),
    });

    if (data) return { available: true, organization: data };
    return {
      available: false,
      reason: response.status === 403 ? "forbidden" : "unavailable",
    };
  } catch {
    return { available: false, reason: "unavailable" };
  }
}

async function getOrganizationSettings(
  token: string,
  organizationId: string,
): Promise<OrganizationSettings> {
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
  if (
    !activeOrganization.available &&
    activeOrganization.reason === "forbidden"
  ) {
    return (
      <ForbiddenState
        description="Your membership does not currently grant access to this Organization. Choose another Organization to continue."
        title="Organization access unavailable"
      />
    );
  }
  const activePermissions = activeOrganization.available
    ? activeOrganization.organization.permissions
    : [];
  const canManageBilling = activePermissions.includes(permission.billingManage);
  const canManageMemberships = activePermissions.includes(
    permission.organizationMembershipsManage,
  );
  const canUpdateOrganizationSettings = activePermissions.includes(
    permission.organizationSettingsUpdate,
  );
  const organizationSettings = activeOrganization.available
    ? await getOrganizationSettings(token, activeOrganization.organization.id)
    : { available: false as const };

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
            <p>Choose the regional defaults used by this Organization.</p>
            {canUpdateOrganizationSettings && organizationSettings.available ? (
              <form
                action={updateOrganizationSettingsAction.bind(
                  null,
                  organizationSettings.value.id,
                  slug,
                )}
                className="organization-settings-form"
              >
                <label>
                  Locale
                  <select
                    defaultValue={organizationSettings.value.locale}
                    name="locale"
                  >
                    <option value="pt-BR">Português (Brasil)</option>
                    <option value="en-US">English (United States)</option>
                  </select>
                </label>
                <label>
                  Time zone
                  <select
                    defaultValue={organizationSettings.value.timeZone}
                    name="timeZone"
                  >
                    <option value="America/Cuiaba">America/Cuiaba</option>
                    <option value="America/Sao_Paulo">America/Sao_Paulo</option>
                    <option value="UTC">UTC</option>
                  </select>
                </label>
                <button className="primary-action" type="submit">
                  Save settings
                </button>
              </form>
            ) : (
              <p data-testid="settings-permission-required">
                You can view these settings, but cannot change them.
              </p>
            )}
          </section>

          {activeOrganization.available ? (
            <>
              <OrganizationMemberships
                actorRole={activeOrganization.organization.role}
                apiUrl={getWebEnvironment().apiUrl.toString()}
                canManage={canManageMemberships}
                organizationId={activeOrganization.organization.id}
              />
              {canManageMemberships ? (
                <OrganizationInvitations
                  apiUrl={getWebEnvironment().apiUrl.toString()}
                  organizationId={activeOrganization.organization.id}
                />
              ) : null}
            </>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
