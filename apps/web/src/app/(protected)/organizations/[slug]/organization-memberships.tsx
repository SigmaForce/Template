"use client";

import { useAuth, useOrganizationList } from "@clerk/nextjs";
import { createApiClient, type components } from "@saas/api-client";
import { Button, Card, ErrorState, Select } from "@saas/ui";
import { useEffect, useState } from "react";
import {
  localizeProductState,
  type SupportedLocale,
} from "../../../../organization-localization";

type Membership = components["schemas"]["MembershipDto"];
type MembershipRole = Membership["role"];
type MembershipUpdate = components["schemas"]["UpdateMembershipDto"];

function text(locale: SupportedLocale, english: string, portuguese: string) {
  return locale === "pt-BR" ? portuguese : english;
}

async function fetchMembershipPage(
  apiUrl: string,
  organizationId: string,
  token: string,
  errorMessage: string,
  cursor?: string,
) {
  const { data } = await createApiClient(apiUrl).GET(
    "/v1/organizations/{organizationId}/memberships",
    {
      cache: "no-store",
      headers: { authorization: `Bearer ${token}` },
      params: {
        path: { organizationId },
        query: { cursor, limit: 20 },
      },
    },
  );
  if (!data) throw new Error(errorMessage);
  return data;
}

export function OrganizationMemberships({
  actorRole,
  apiUrl,
  canManage,
  locale,
  organizationId,
}: {
  actorRole: MembershipRole;
  apiUrl: string;
  canManage: boolean;
  locale: SupportedLocale;
  organizationId: string;
}) {
  const t = (english: string, portuguese: string) =>
    text(locale, english, portuguese);
  const ownerRoleOptions = [
    { label: t("Owner", "Proprietário"), value: "owner" },
    { label: t("Admin", "Administrador"), value: "admin" },
    { label: t("Member", "Membro"), value: "member" },
  ];
  const adminRoleOptions = ownerRoleOptions.slice(1);
  const { getToken, userId } = useAuth();
  const { setActive } = useOrganizationList({ userMemberships: true });
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(canManage);
  const [nextCursor, setNextCursor] = useState<string | null>();
  const [pendingAction, setPendingAction] = useState<string>();
  const [problem, setProblem] = useState<string>();

  useEffect(() => {
    if (!canManage) return;
    let active = true;

    void (async () => {
      try {
        const token = await getToken();
        if (!token)
          throw new Error(
            text(
              locale,
              "Your session is unavailable. Sign in again.",
              "Sua sessão está indisponível. Entre novamente.",
            ),
          );
        const page = await fetchMembershipPage(
          apiUrl,
          organizationId,
          token,
          text(
            locale,
            "Memberships could not be loaded.",
            "Não foi possível carregar os vínculos.",
          ),
        );
        if (active) {
          setMemberships(page.items);
          setNextCursor(page.pageInfo.nextCursor);
        }
      } catch (error) {
        if (active)
          setProblem(
            error instanceof Error
              ? error.message
              : text(
                  locale,
                  "Memberships could not be loaded.",
                  "Não foi possível carregar os vínculos.",
                ),
          );
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [apiUrl, canManage, getToken, locale, organizationId]);

  async function authorization() {
    const token = await getToken();
    if (!token)
      throw new Error(
        t(
          "Your session is unavailable. Sign in again.",
          "Sua sessão está indisponível. Entre novamente.",
        ),
      );
    return { authorization: `Bearer ${token}` };
  }

  async function leaveActiveOrganization() {
    await setActive?.({ organization: null });
    window.location.replace("/");
  }

  async function loadMore() {
    if (!nextCursor) return;
    setPendingAction("load-more");
    setProblem(undefined);
    try {
      const token = await getToken();
      if (!token)
        throw new Error(
          t(
            "Your session is unavailable. Sign in again.",
            "Sua sessão está indisponível. Entre novamente.",
          ),
        );
      const page = await fetchMembershipPage(
        apiUrl,
        organizationId,
        token,
        t(
          "Memberships could not be loaded.",
          "Não foi possível carregar os vínculos.",
        ),
        nextCursor,
      );
      setMemberships((current) => [...current, ...page.items]);
      setNextCursor(page.pageInfo.nextCursor);
    } catch (error) {
      setProblem(
        error instanceof Error
          ? error.message
          : t(
              "Memberships could not be loaded.",
              "Não foi possível carregar os vínculos.",
            ),
      );
    } finally {
      setPendingAction(undefined);
    }
  }

  async function update(userIdToUpdate: string, body: MembershipUpdate) {
    setPendingAction(userIdToUpdate);
    setProblem(undefined);
    try {
      const { data } = await createApiClient(apiUrl).PATCH(
        "/v1/organizations/{organizationId}/memberships/{userId}",
        {
          body,
          headers: await authorization(),
          params: { path: { organizationId, userId: userIdToUpdate } },
        },
      );
      if (!data)
        throw new Error(
          t(
            "Membership could not be updated.",
            "Não foi possível atualizar o vínculo.",
          ),
        );
      setMemberships((current) =>
        current.map((membership) =>
          membership.userId === data.userId ? data : membership,
        ),
      );
      if (userIdToUpdate === userId && body.status === "suspended") {
        await leaveActiveOrganization();
      }
      if (userIdToUpdate === userId && body.role) window.location.reload();
    } catch (error) {
      setProblem(
        error instanceof Error
          ? error.message
          : t(
              "Membership could not be updated.",
              "Não foi possível atualizar o vínculo.",
            ),
      );
    } finally {
      setPendingAction(undefined);
    }
  }

  async function remove(userIdToRemove: string) {
    const isSelf = userIdToRemove === userId;
    if (
      !window.confirm(
        isSelf
          ? t("Leave this Organization?", "Sair desta organização?")
          : t("Remove this Membership?", "Remover este vínculo?"),
      )
    )
      return;

    setPendingAction(userIdToRemove);
    setProblem(undefined);
    try {
      const { data } = await createApiClient(apiUrl).DELETE(
        "/v1/organizations/{organizationId}/memberships/{userId}",
        {
          headers: await authorization(),
          params: { path: { organizationId, userId: userIdToRemove } },
        },
      );
      if (!data)
        throw new Error(
          t(
            "Membership could not be removed.",
            "Não foi possível remover o vínculo.",
          ),
        );
      setMemberships((current) =>
        current.map((membership) =>
          membership.userId === data.userId ? data : membership,
        ),
      );
      if (isSelf) await leaveActiveOrganization();
    } catch (error) {
      setProblem(
        error instanceof Error
          ? error.message
          : t(
              "Membership could not be removed.",
              "Não foi possível remover o vínculo.",
            ),
      );
    } finally {
      setPendingAction(undefined);
    }
  }

  if (!canManage) {
    return (
      <Card
        description={t(
          "You can leave without deleting Organization data.",
          "Você pode sair sem excluir os dados da organização.",
        )}
        title={t("Your Membership", "Seu vínculo")}
      >
        <p className="mb-4 text-sm capitalize text-muted">
          {t("Role", "Função")}: {localizeProductState(actorRole, locale)}
        </p>
        <Button
          loading={pendingAction === userId}
          loadingLabel={t("Leaving Organization", "Saindo da organização")}
          onClick={() => userId && void remove(userId)}
          type="button"
          variant="danger"
        >
          {t("Leave Organization", "Sair da organização")}
        </Button>
        {problem ? (
          <div className="mt-5">
            <ErrorState
              description={problem}
              title={t("Membership action failed", "A ação no vínculo falhou")}
            />
          </div>
        ) : null}
      </Card>
    );
  }

  return (
    <Card
      description={t(
        "Change Roles, suspend access, restore, or remove Memberships.",
        "Altere funções, suspenda acessos, restaure ou remova vínculos.",
      )}
      title={t("Team Memberships", "Vínculos da equipe")}
    >
      {problem ? (
        <div className="mb-5">
          <ErrorState
            description={problem}
            title={t("Membership action failed", "A ação no vínculo falhou")}
          />
        </div>
      ) : null}
      {loading ? (
        <p className="text-sm text-muted" role="status">
          {t("Loading Memberships…", "Carregando vínculos…")}
        </p>
      ) : (
        <>
          <ul className="grid gap-3">
            {memberships.map((membership) => {
              const isSelf = membership.userId === userId;
              const canChange =
                membership.status !== "removed" &&
                (actorRole === "owner" || membership.role !== "owner");

              return (
                <li
                  className="grid gap-3 rounded-control border border-border p-3 text-sm"
                  key={membership.userId}
                >
                  <div>
                    <strong className="break-all text-foreground">
                      {membership.userId}
                      {isSelf ? t(" (you)", " (você)") : ""}
                    </strong>
                    <p className="mt-1 capitalize text-muted">
                      {localizeProductState(membership.role, locale)} ·{" "}
                      {localizeProductState(membership.status, locale)}
                    </p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,12rem)_1fr]">
                    <Select
                      disabled={
                        !canChange || pendingAction === membership.userId
                      }
                      label={`${t("Role for", "Função de")} ${membership.userId}`}
                      onValueChange={(value) => {
                        if (
                          value === "owner" ||
                          value === "admin" ||
                          value === "member"
                        )
                          void update(membership.userId, { role: value });
                      }}
                      options={
                        actorRole === "owner"
                          ? ownerRoleOptions
                          : adminRoleOptions
                      }
                      size="sm"
                      value={membership.role}
                    />
                    <div className="flex flex-wrap gap-2">
                      {canChange && membership.status !== "removed" ? (
                        <Button
                          loading={pendingAction === membership.userId}
                          loadingLabel={
                            membership.status === "active"
                              ? t(
                                  "Suspending Membership",
                                  "Suspendendo vínculo",
                                )
                              : t("Restoring Membership", "Restaurando vínculo")
                          }
                          onClick={() =>
                            void update(membership.userId, {
                              status:
                                membership.status === "active"
                                  ? "suspended"
                                  : "active",
                            })
                          }
                          size="sm"
                          type="button"
                          variant="secondary"
                        >
                          {membership.status === "active"
                            ? t("Suspend", "Suspender")
                            : t("Restore", "Restaurar")}
                        </Button>
                      ) : null}
                      {canChange && membership.status !== "removed" ? (
                        <Button
                          disabled={pendingAction === membership.userId}
                          onClick={() => void remove(membership.userId)}
                          size="sm"
                          type="button"
                          variant="danger"
                        >
                          {isSelf
                            ? t("Leave", "Sair")
                            : t("Remove Membership", "Remover vínculo")}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          {nextCursor ? (
            <Button
              className="mt-4"
              loading={pendingAction === "load-more"}
              loadingLabel={t(
                "Loading more Memberships",
                "Carregando mais vínculos",
              )}
              onClick={() => void loadMore()}
              type="button"
              variant="secondary"
            >
              {t("Load more", "Carregar mais")}
            </Button>
          ) : null}
        </>
      )}
    </Card>
  );
}
