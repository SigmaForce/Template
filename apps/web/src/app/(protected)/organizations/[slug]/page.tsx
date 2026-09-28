import type { components } from "@saas/api-client";
import { brand, ForbiddenState } from "@saas/ui";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { logWebOperation } from "../../../../operational-log";
import { createServerApiContext } from "../../../../server-api-context";
import { getWebEnvironment } from "../../../../environment";
import { getOrganizationSettings } from "../../../../organization-settings";
import { OrganizationInvitations } from "./organization-invitations";
import { OrganizationLinkRedirect } from "./organization-link-redirect";
import { OrganizationMemberships } from "./organization-memberships";
import { BillingPortalButton } from "./billing-portal-button";
import { OrganizationAuditEvents } from "./organization-audit-events";
import { OrganizationApiKeys } from "./organization-api-keys";
import {
  formatCivilDate,
  formatMoney,
  localize,
  localizeCapability,
  localizeProductState,
  resolveSupportedLocale,
} from "../../../../organization-localization";

type Money = components["schemas"]["MoneyDto"];
type PermissionId =
  components["schemas"]["ActiveOrganizationDto"]["permissions"][number];

const permission = {
  billingManage: "billing:manage",
  organizationAuditEventsRead: "organization:audit-events:read",
  organizationApiKeysIssue: "organization:api-keys:issue",
  organizationApiKeysManage: "organization:api-keys:manage",
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

type BillingCatalog =
  | {
      available: true;
      value: components["schemas"]["PlanCatalogDto"];
    }
  | { available: false };

type BillingSubscription =
  | {
      available: true;
      value: components["schemas"]["SubscriptionDto"];
    }
  | { available: false };

type OrganizationSlugResolution =
  | {
      available: true;
      organization: components["schemas"]["OrganizationSlugResolutionDto"];
    }
  | { available: false; reason: "forbidden" | "unavailable" };

async function updateOrganizationSettingsAction(
  organizationId: string,
  slug: string,
  formData: FormData,
) {
  "use server";

  const billingContactEmail = formData.get("billingContactEmail");
  const locale = formData.get("locale");
  const name = formData.get("name");
  const nextSlug = formData.get("slug");
  const timeZone = formData.get("timeZone");
  const actionLocale = resolveSupportedLocale(locale);
  const actionMessage = (english: string, portuguese: string) =>
    localize(actionLocale, english, portuguese);
  if (
    typeof billingContactEmail !== "string" ||
    typeof name !== "string" ||
    typeof nextSlug !== "string" ||
    (locale !== "en-US" && locale !== "pt-BR") ||
    (timeZone !== "America/Cuiaba" &&
      timeZone !== "America/Sao_Paulo" &&
      timeZone !== "UTC")
  ) {
    throw new Error(
      actionMessage(
        "Invalid Organization settings.",
        "As configurações da organização são inválidas.",
      ),
    );
  }

  const session = await auth();
  if (session.orgId !== organizationId) {
    throw new Error(
      actionMessage(
        "Active Organization changed. Reload and try again.",
        "A organização ativa mudou. Recarregue e tente novamente.",
      ),
    );
  }
  const token = await session.getToken();
  if (!token)
    throw new Error(
      actionMessage(
        "Authentication is required.",
        "A autenticação é obrigatória.",
      ),
    );

  const { client, correlatedHeaders } = await createServerApiContext();
  const { data, error } = await client.PATCH(
    "/v1/organizations/{organizationId}/settings",
    {
      headers: {
        ...correlatedHeaders,
        authorization: `Bearer ${token}`,
      },
      params: { path: { organizationId } },
      body: {
        billingContactEmail: billingContactEmail || null,
        locale,
        name,
        slug: nextSlug,
        timeZone,
      },
    },
  );
  if (error || !data) {
    throw new Error(
      actionMessage(
        "Organization settings could not be updated.",
        "Não foi possível atualizar as configurações da organização.",
      ),
    );
  }

  revalidatePath(`/organizations/${slug}`, "layout");
  redirect(`/organizations/${data.slug}`);
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

async function getBillingCatalog(
  token: string,
  organizationId: string,
): Promise<BillingCatalog> {
  try {
    const { client, correlatedHeaders } = await createServerApiContext();
    const { data } = await client.GET(
      "/v1/organizations/{organizationId}/billing/catalog",
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

async function getBillingSubscription(
  token: string,
  organizationId: string,
): Promise<BillingSubscription> {
  try {
    const { client, correlatedHeaders } = await createServerApiContext();
    const { data } = await client.GET(
      "/v1/organizations/{organizationId}/billing/subscription",
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

async function resolveOrganizationSlug(
  token: string,
  slug: string,
): Promise<OrganizationSlugResolution> {
  try {
    const { client, correlatedHeaders } = await createServerApiContext();
    const { data, response } = await client.GET(
      "/v1/organizations/by-slug/{slug}",
      {
        cache: "no-store",
        headers: {
          ...correlatedHeaders,
          authorization: `Bearer ${token}`,
        },
        params: { path: { slug } },
        signal: AbortSignal.timeout(3_000),
      },
    );

    if (data) return { available: true, organization: data };
    return {
      available: false,
      reason: response.status === 403 ? "forbidden" : "unavailable",
    };
  } catch {
    return { available: false, reason: "unavailable" };
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

export default async function Home({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [{ slug }, session] = await Promise.all([params, auth()]);
  const { getToken, orgId } = session;

  const token = await getToken();
  if (!token) redirect("/");

  const [api, identity, activeOrganization, slugResolution] = await Promise.all(
    [
      getApiAvailability(),
      getAuthenticatedIdentity(token),
      getActiveOrganization(token),
      resolveOrganizationSlug(token, slug),
    ],
  );
  if (!slugResolution.available) {
    return (
      <ForbiddenState
        description={
          slugResolution.reason === "forbidden"
            ? "Your membership does not grant access to the Organization referenced by this link."
            : "The Organization link could not be resolved. Try again."
        }
        title="Organization link unavailable"
      />
    );
  }
  if (orgId !== slugResolution.organization.id) {
    return (
      <OrganizationLinkRedirect
        organizationId={slugResolution.organization.id}
        slug={slugResolution.organization.slug}
      />
    );
  }
  if (slugResolution.organization.slug !== slug) {
    redirect(`/organizations/${slugResolution.organization.slug}`);
  }
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
  const canReviewAuditEvents = activePermissions.includes(
    permission.organizationAuditEventsRead,
  );
  const canManageApiKeys = activePermissions.includes(
    permission.organizationApiKeysManage,
  );
  const canIssueApiKeys = activePermissions.includes(
    permission.organizationApiKeysIssue,
  );
  const canManageMemberships = activePermissions.includes(
    permission.organizationMembershipsManage,
  );
  const canUpdateOrganizationSettings = activePermissions.includes(
    permission.organizationSettingsUpdate,
  );
  const [organizationSettings, billingCatalog, billingSubscription] =
    activeOrganization.available
      ? await Promise.all([
          getOrganizationSettings(token, activeOrganization.organization.id),
          canManageBilling
            ? getBillingCatalog(token, activeOrganization.organization.id)
            : Promise.resolve({ available: false as const }),
          canManageBilling
            ? getBillingSubscription(token, activeOrganization.organization.id)
            : Promise.resolve({ available: false as const }),
        ])
      : [
          { available: false as const },
          { available: false as const },
          { available: false as const },
        ];
  const locale = resolveSupportedLocale(
    organizationSettings.available
      ? organizationSettings.value.locale
      : undefined,
  );
  const timeZone = organizationSettings.available
    ? organizationSettings.value.timeZone
    : "UTC";
  const t = (english: string, portuguese: string) =>
    localize(locale, english, portuguese);

  return (
    <div className="dashboard-page" id="overview" lang={locale}>
      <header className="dashboard-intro">
        <div>
          <p className="eyebrow">{formatCivilDate("2026-09-15", locale)}</p>
          <h1 id="page-title">{t("Good morning, Alex.", "Bom dia, Alex.")}</h1>
          <p className="lede">
            {t(
              `Here is what deserves your attention across ${brand.organizationName} today.`,
              `Veja o que merece sua atenção na ${brand.organizationName} hoje.`,
            )}
          </p>
        </div>
        <a className="primary-action" href="#activity">
          {t("Review activity", "Revisar atividade")}
          <span aria-hidden="true">→</span>
        </a>
      </header>

      <div className="dashboard-grid">
        <div className="dashboard-main-column">
          <section className="spotlight-card" aria-labelledby="focus-title">
            <div>
              <p className="eyebrow">{t("This week", "Nesta semana")}</p>
              <h2 id="focus-title">
                {t("Momentum is building.", "O ritmo está aumentando.")}
              </h2>
              <p>
                {t(
                  "Eighteen priorities moved forward and your team closed two long-running decisions.",
                  "Dezoito prioridades avançaram e sua equipe concluiu duas decisões de longa duração.",
                )}
              </p>
            </div>
            <div
              className="momentum-score"
              aria-label={t(
                "84 percent weekly momentum",
                "84 por cento de ritmo semanal",
              )}
            >
              <strong>84%</strong>
              <span>{t("momentum", "ritmo")}</span>
            </div>
          </section>

          <section
            className="activity-card"
            id="activity"
            aria-labelledby="activity-title"
          >
            <div className="section-heading">
              <div>
                <p className="eyebrow">
                  {t("Latest signals", "Sinais recentes")}
                </p>
                <h2 id="activity-title">
                  {t("Team activity", "Atividade da equipe")}
                </h2>
              </div>
              <a href="#activity">{t("View all", "Ver tudo")}</a>
            </div>
            <ol className="activity-list">
              <li>
                <span className="activity-mark" aria-hidden="true">
                  LM
                </span>
                <div>
                  <strong>
                    {t(
                      "Launch milestone approved",
                      "Marco de lançamento aprovado",
                    )}
                  </strong>
                  <p>
                    {t(
                      "Leadership · 12 minutes ago",
                      "Liderança · há 12 minutos",
                    )}
                  </p>
                </div>
                <span className="activity-tag">{t("Decision", "Decisão")}</span>
              </li>
              <li>
                <span className="activity-mark" aria-hidden="true">
                  PS
                </span>
                <div>
                  <strong>
                    {t(
                      "Product scorecard shared",
                      "Painel do produto compartilhado",
                    )}
                  </strong>
                  <p>
                    {t("Product · 48 minutes ago", "Produto · há 48 minutos")}
                  </p>
                </div>
                <span className="activity-tag">
                  {t("Update", "Atualização")}
                </span>
              </li>
              <li>
                <span className="activity-mark" aria-hidden="true">
                  CS
                </span>
                <div>
                  <strong>
                    {t(
                      "Customer review completed",
                      "Revisão do cliente concluída",
                    )}
                  </strong>
                  <p>{t("Success · 2 hours ago", "Sucesso · há 2 horas")}</p>
                </div>
                <span className="activity-tag">{t("Insight", "Análise")}</span>
              </li>
            </ol>
          </section>
        </div>

        <aside
          className="dashboard-side-column"
          aria-label={t("Organization summary", "Resumo da organização")}
        >
          <section
            className="status-card"
            data-available={identity.available}
            role="status"
          >
            <div className="status-heading">
              <span className="status-dot" aria-hidden="true" />
              <p>{t("Authentication", "Autenticação")}</p>
            </div>
            <div>
              <h2>
                {identity.available
                  ? t("Verified User", "Usuário verificado")
                  : t("Identity unavailable", "Identidade indisponível")}
              </h2>
              <p>
                {identity.available
                  ? t(
                      "The generated client reached the protected API with a verified session token.",
                      "O cliente gerado acessou a API protegida com um token de sessão verificado.",
                    )
                  : t(
                      "The protected API could not verify this session.",
                      "A API protegida não conseguiu verificar esta sessão.",
                    )}
              </p>
              {identity.available ? (
                <>
                  <div className="contract-example">
                    <span>{t("User", "Usuário")}</span>
                    <span data-testid="authenticated-user-id">
                      {identity.id}
                    </span>
                  </div>
                  {activeOrganization.available ? (
                    <div className="contract-example">
                      <span>
                        {t("Active Organization", "Organização ativa")}
                      </span>
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
              <p>{t("System status", "Status do sistema")}</p>
            </div>
            <div>
              <h2>
                {api.available
                  ? t("API contract is available", "Contrato da API disponível")
                  : t(
                      "API contract is unavailable",
                      "Contrato da API indisponível",
                    )}
              </h2>
              <p>
                {api.available
                  ? t(
                      "The generated client reached the versioned backend contract.",
                      "O cliente gerado acessou o contrato versionado do backend.",
                    )
                  : t(
                      "Start the API or check NEXT_PUBLIC_API_URL, then try again.",
                      "Inicie a API ou verifique NEXT_PUBLIC_API_URL e tente novamente.",
                    )}
              </p>
              {api.available ? (
                <div className="contract-example">
                  <span data-testid="contract-example-name">
                    {api.example.name}
                  </span>
                  <span data-testid="contract-example-price">
                    {formatMoney(api.example.price, locale)}
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
            <p className="eyebrow">{t("Billing", "Cobrança")}</p>
            <h2 id="billing-title">
              {t("Plan catalog", "Catálogo de planos")}
            </h2>
            {billingSubscription.available ? (
              <>
                <div className="contract-example">
                  <span>{t("Active Subscription", "Assinatura ativa")}</span>
                  <span data-testid="active-subscription">
                    {billingSubscription.value.planId} v
                    {billingSubscription.value.planVersion} ·{" "}
                    {localizeProductState(
                      billingSubscription.value.status,
                      locale,
                    )}
                  </span>
                </div>
                {billingSubscription.value.scheduledPlanId ? (
                  <p data-testid="scheduled-plan-change">
                    {t("Changes to", "Muda para")}{" "}
                    {billingSubscription.value.scheduledPlanId}{" "}
                    {t(
                      "when the current period ends.",
                      "quando o período atual terminar.",
                    )}
                  </p>
                ) : null}
                {billingSubscription.value.cancelAtPeriodEnd ? (
                  <p data-testid="scheduled-cancellation">
                    {t(
                      "Cancels when the current period ends.",
                      "Será cancelada quando o período atual terminar.",
                    )}
                  </p>
                ) : null}
              </>
            ) : null}
            {billingCatalog.available ? (
              <>
                <p>
                  {t("Catalog version", "Versão do catálogo")}{" "}
                  {billingCatalog.value.version}
                </p>
                <ul className="plan-catalog">
                  {billingCatalog.value.plans.map((plan) => (
                    <li key={`${plan.id}-v${plan.version}`}>
                      <h3>
                        {plan.name} v{plan.version}
                      </h3>
                      <p>
                        {plan.seatAllowance}{" "}
                        {t("Seats included", "assentos incluídos")}
                      </p>
                      <ul
                        aria-label={`${plan.name} ${t("Capabilities", "recursos")}`}
                      >
                        {plan.capabilities.map((capabilityId) => (
                          <li key={capabilityId}>
                            {localizeCapability(
                              capabilityId,
                              billingCatalog.value.capabilities.find(
                                (capability) => capability.id === capabilityId,
                              )?.name ?? capabilityId,
                              locale,
                            )}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </>
            ) : canManageBilling ? (
              <p role="status">
                {t(
                  "The Plan catalog is currently unavailable.",
                  "O catálogo de planos está indisponível no momento.",
                )}
              </p>
            ) : (
              <p data-testid="billing-permission-required">
                {t(
                  "An Owner can view and manage Plans.",
                  "Um proprietário pode ver e gerenciar os planos.",
                )}
              </p>
            )}
            <BillingPortalButton
              apiUrl={getWebEnvironment().apiUrl.toString()}
              canManage={canManageBilling}
              locale={locale}
              organizationId={
                activeOrganization.available
                  ? activeOrganization.organization.id
                  : ""
              }
            />
          </section>

          <section
            className="compact-card"
            id="settings"
            aria-labelledby="settings-title"
          >
            <p className="eyebrow">{t("Organization", "Organização")}</p>
            <h2 id="settings-title">
              {t("Make it yours", "Deixe do seu jeito")}
            </h2>
            <p>
              {t(
                "Manage the identity and regional defaults for this Organization.",
                "Gerencie a identidade e os padrões regionais desta organização.",
              )}
            </p>
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
                  {t("Organization name", "Nome da organização")}
                  <input
                    defaultValue={organizationSettings.value.name}
                    maxLength={100}
                    minLength={2}
                    name="name"
                    required
                  />
                </label>
                <label>
                  {t("Organization URL slug", "Slug da URL da organização")}
                  <input
                    defaultValue={organizationSettings.value.slug}
                    maxLength={48}
                    minLength={3}
                    name="slug"
                    pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                    required
                  />
                </label>
                <label>
                  {t("Billing contact", "Contato de cobrança")}
                  <input
                    defaultValue={
                      organizationSettings.value.billingContactEmail ?? ""
                    }
                    name="billingContactEmail"
                    type="email"
                  />
                </label>
                <label>
                  {t("Locale", "Idioma")}
                  <select
                    defaultValue={organizationSettings.value.locale}
                    name="locale"
                  >
                    <option value="pt-BR">Português (Brasil)</option>
                    <option value="en-US">English (United States)</option>
                  </select>
                </label>
                <label>
                  {t("Time zone", "Fuso horário")}
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
                  {t("Save settings", "Salvar configurações")}
                </button>
              </form>
            ) : organizationSettings.available ? (
              <>
                <dl className="organization-settings-values">
                  <dt>{t("Name", "Nome")}</dt>
                  <dd>{organizationSettings.value.name}</dd>
                  <dt>Slug</dt>
                  <dd>{organizationSettings.value.slug}</dd>
                  <dt>{t("Billing contact", "Contato de cobrança")}</dt>
                  <dd>
                    {organizationSettings.value.billingContactEmail ??
                      t("Not set", "Não definido")}
                  </dd>
                  <dt>{t("Locale", "Idioma")}</dt>
                  <dd>{organizationSettings.value.locale}</dd>
                  <dt>{t("Time zone", "Fuso horário")}</dt>
                  <dd>{organizationSettings.value.timeZone}</dd>
                </dl>
                <p data-testid="settings-permission-required">
                  {t(
                    "You can view these settings, but cannot change them.",
                    "Você pode ver estas configurações, mas não pode alterá-las.",
                  )}
                </p>
              </>
            ) : (
              <p>
                {t(
                  "Organization settings are unavailable.",
                  "As configurações da organização estão indisponíveis.",
                )}
              </p>
            )}
            <p data-testid="future-organization-settings">
              {t(
                "Logo and custom domain support are future capabilities and are not configurable yet.",
                "Logo e domínio personalizado são recursos futuros e ainda não podem ser configurados.",
              )}
            </p>
          </section>

          {activeOrganization.available ? (
            <>
              <OrganizationAuditEvents
                apiUrl={getWebEnvironment().apiUrl.toString()}
                canReview={canReviewAuditEvents}
                locale={locale}
                organizationId={activeOrganization.organization.id}
                timeZone={timeZone}
              />
              <OrganizationApiKeys
                apiUrl={getWebEnvironment().apiUrl.toString()}
                canIssue={canIssueApiKeys}
                canManage={canManageApiKeys}
                locale={locale}
                organizationId={activeOrganization.organization.id}
              />
              <OrganizationMemberships
                actorRole={activeOrganization.organization.role}
                apiUrl={getWebEnvironment().apiUrl.toString()}
                canManage={canManageMemberships}
                locale={locale}
                organizationId={activeOrganization.organization.id}
              />
              {canManageMemberships ? (
                <OrganizationInvitations
                  apiUrl={getWebEnvironment().apiUrl.toString()}
                  locale={locale}
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
