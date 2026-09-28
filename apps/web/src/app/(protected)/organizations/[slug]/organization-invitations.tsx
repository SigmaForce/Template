"use client";

import { useAuth } from "@clerk/nextjs";
import { createApiClient, type components } from "@saas/api-client";
import { Button, Card, ErrorState, FormField, Input, Select } from "@saas/ui";
import { useEffect, useState, type FormEvent } from "react";
import {
  localizeProductState,
  type SupportedLocale,
} from "../../../../organization-localization";

type Invitation = components["schemas"]["OrganizationInvitationDto"];
type InvitationRole = components["schemas"]["CreateInvitationDto"]["role"];

function text(locale: SupportedLocale, english: string, portuguese: string) {
  return locale === "pt-BR" ? portuguese : english;
}

export function OrganizationInvitations({
  apiUrl,
  locale,
  organizationId,
}: {
  apiUrl: string;
  locale: SupportedLocale;
  organizationId: string;
}) {
  const t = (english: string, portuguese: string) =>
    text(locale, english, portuguese);
  const roleOptions = [
    { label: t("Member", "Membro"), value: "member" },
    { label: t("Admin", "Administrador"), value: "admin" },
  ];
  const { getToken } = useAuth();
  const [emailAddress, setEmailAddress] = useState("");
  const [role, setRole] = useState<InvitationRole>("member");
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<string>();
  const [problem, setProblem] = useState<string>();

  useEffect(() => {
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
        const { data } = await createApiClient(apiUrl).GET(
          "/v1/organizations/{organizationId}/invitations",
          {
            cache: "no-store",
            headers: { authorization: `Bearer ${token}` },
            params: { path: { organizationId } },
          },
        );
        if (!data)
          throw new Error(
            text(
              locale,
              "Invitations could not be loaded.",
              "Não foi possível carregar os convites.",
            ),
          );
        if (active) setInvitations(data.items);
      } catch (error) {
        if (active) {
          setProblem(
            error instanceof Error
              ? error.message
              : text(
                  locale,
                  "Invitations could not be loaded.",
                  "Não foi possível carregar os convites.",
                ),
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [apiUrl, getToken, locale, organizationId]);

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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingAction("create");
    setProblem(undefined);
    try {
      const { data } = await createApiClient(apiUrl).POST(
        "/v1/organizations/{organizationId}/invitations",
        {
          body: { emailAddress, role },
          headers: await authorization(),
          params: { path: { organizationId } },
        },
      );
      if (!data)
        throw new Error(
          t(
            "Invitation could not be sent.",
            "Não foi possível enviar o convite.",
          ),
        );
      setInvitations((current) => [
        data,
        ...current.filter((item) => item.id !== data.id),
      ]);
      setEmailAddress("");
    } catch (error) {
      setProblem(
        error instanceof Error
          ? error.message
          : t(
              "Invitation could not be sent.",
              "Não foi possível enviar o convite.",
            ),
      );
    } finally {
      setPendingAction(undefined);
    }
  }

  async function resend(invitationId: string) {
    setPendingAction(invitationId);
    setProblem(undefined);
    try {
      const { data } = await createApiClient(apiUrl).POST(
        "/v1/organizations/{organizationId}/invitations/{invitationId}/resend",
        {
          headers: await authorization(),
          params: { path: { organizationId, invitationId } },
        },
      );
      if (!data)
        throw new Error(
          t(
            "Invitation could not be resent.",
            "Não foi possível reenviar o convite.",
          ),
        );
      setInvitations((current) =>
        current.map((item) => (item.id === data.id ? data : item)),
      );
    } catch (error) {
      setProblem(
        error instanceof Error
          ? error.message
          : t(
              "Invitation could not be resent.",
              "Não foi possível reenviar o convite.",
            ),
      );
    } finally {
      setPendingAction(undefined);
    }
  }

  async function revoke(invitationId: string) {
    setPendingAction(invitationId);
    setProblem(undefined);
    try {
      const { data } = await createApiClient(apiUrl).DELETE(
        "/v1/organizations/{organizationId}/invitations/{invitationId}",
        {
          headers: await authorization(),
          params: { path: { organizationId, invitationId } },
        },
      );
      if (!data)
        throw new Error(
          t(
            "Invitation could not be revoked.",
            "Não foi possível revogar o convite.",
          ),
        );
      setInvitations((current) =>
        current.map((item) => (item.id === data.id ? data : item)),
      );
    } catch (error) {
      setProblem(
        error instanceof Error
          ? error.message
          : t(
              "Invitation could not be revoked.",
              "Não foi possível revogar o convite.",
            ),
      );
    } finally {
      setPendingAction(undefined);
    }
  }

  return (
    <Card
      description={t(
        "Invite people without consuming a seat until they accept.",
        "Convide pessoas sem ocupar um assento até que elas aceitem.",
      )}
      title={t("Team invitations", "Convites da equipe")}
    >
      <form className="grid gap-4" onSubmit={submit}>
        <FormField label={t("Email address", "Endereço de e-mail")} required>
          <Input
            autoComplete="email"
            name="emailAddress"
            onChange={(event) => setEmailAddress(event.target.value)}
            required
            type="email"
            value={emailAddress}
          />
        </FormField>
        <FormField label={t("Role", "Função")} required>
          <Select
            label={t("Role", "Função")}
            name="role"
            onValueChange={(value) => {
              if (value === "admin" || value === "member") setRole(value);
            }}
            options={roleOptions}
            required
            value={role}
          />
        </FormField>
        <Button
          className="justify-self-start"
          loading={pendingAction === "create"}
          loadingLabel={t("Sending invitation", "Enviando convite")}
          type="submit"
        >
          {t("Send invitation", "Enviar convite")}
        </Button>
      </form>

      {problem ? (
        <div className="mt-5">
          <ErrorState
            description={problem}
            title={t("Invitation action failed", "A ação no convite falhou")}
          />
        </div>
      ) : null}

      <div className="mt-6 border-t border-border pt-5">
        {loading ? (
          <p className="text-sm text-muted" role="status">
            {t("Loading invitations…", "Carregando convites…")}
          </p>
        ) : invitations.length === 0 ? (
          <p className="text-sm text-muted">
            {t("No invitations yet.", "Nenhum convite até agora.")}
          </p>
        ) : (
          <ul className="grid gap-3">
            {invitations.map((invitation) => (
              <li
                className="grid gap-3 rounded-control border border-border p-3 text-sm"
                key={invitation.id}
              >
                <div>
                  <strong className="break-all text-foreground">
                    {invitation.emailAddress}
                  </strong>
                  <p className="mt-1 capitalize text-muted">
                    {localizeProductState(invitation.role, locale)} ·{" "}
                    {localizeProductState(invitation.status, locale)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {invitation.status === "pending" ? (
                    <Button
                      loading={pendingAction === invitation.id}
                      loadingLabel={t(
                        "Revoking invitation",
                        "Revogando convite",
                      )}
                      onClick={() => void revoke(invitation.id)}
                      size="sm"
                      type="button"
                      variant="danger"
                    >
                      {t("Revoke", "Revogar")}
                    </Button>
                  ) : null}
                  {invitation.status === "expired" ||
                  invitation.status === "revoked" ? (
                    <Button
                      loading={pendingAction === invitation.id}
                      loadingLabel={t(
                        "Resending invitation",
                        "Reenviando convite",
                      )}
                      onClick={() => void resend(invitation.id)}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      {t("Resend", "Reenviar")}
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
