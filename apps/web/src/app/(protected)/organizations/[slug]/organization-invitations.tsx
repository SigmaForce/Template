"use client";

import { useAuth } from "@clerk/nextjs";
import { createApiClient, type components } from "@saas/api-client";
import { Button, Card, ErrorState, FormField, Input, Select } from "@saas/ui";
import { useEffect, useState, type FormEvent } from "react";

type Invitation = components["schemas"]["OrganizationInvitationDto"];
type InvitationRole = components["schemas"]["CreateInvitationDto"]["role"];

const roleOptions = [
  { label: "Member", value: "member" },
  { label: "Admin", value: "admin" },
];

export function OrganizationInvitations({
  apiUrl,
  organizationId,
}: {
  apiUrl: string;
  organizationId: string;
}) {
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
          throw new Error("Your session is unavailable. Sign in again.");
        const { data } = await createApiClient(apiUrl).GET(
          "/v1/organizations/{organizationId}/invitations",
          {
            cache: "no-store",
            headers: { authorization: `Bearer ${token}` },
            params: { path: { organizationId } },
          },
        );
        if (!data) throw new Error("Invitations could not be loaded.");
        if (active) setInvitations(data.items);
      } catch (error) {
        if (active) {
          setProblem(
            error instanceof Error
              ? error.message
              : "Invitations could not be loaded.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [apiUrl, getToken, organizationId]);

  async function authorization() {
    const token = await getToken();
    if (!token) throw new Error("Your session is unavailable. Sign in again.");
    return { authorization: `Bearer ${token}` };
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingAction("create");
    setProblem(undefined);
    try {
      const { data, error } = await createApiClient(apiUrl).POST(
        "/v1/organizations/{organizationId}/invitations",
        {
          body: { emailAddress, role },
          headers: await authorization(),
          params: { path: { organizationId } },
        },
      );
      if (!data)
        throw new Error(error?.detail ?? "Invitation could not be sent.");
      setInvitations((current) => [
        data,
        ...current.filter((item) => item.id !== data.id),
      ]);
      setEmailAddress("");
    } catch (error) {
      setProblem(
        error instanceof Error
          ? error.message
          : "Invitation could not be sent.",
      );
    } finally {
      setPendingAction(undefined);
    }
  }

  async function resend(invitationId: string) {
    setPendingAction(invitationId);
    setProblem(undefined);
    try {
      const { data, error } = await createApiClient(apiUrl).POST(
        "/v1/organizations/{organizationId}/invitations/{invitationId}/resend",
        {
          headers: await authorization(),
          params: { path: { organizationId, invitationId } },
        },
      );
      if (!data)
        throw new Error(error?.detail ?? "Invitation could not be resent.");
      setInvitations((current) =>
        current.map((item) => (item.id === data.id ? data : item)),
      );
    } catch (error) {
      setProblem(
        error instanceof Error
          ? error.message
          : "Invitation could not be resent.",
      );
    } finally {
      setPendingAction(undefined);
    }
  }

  async function revoke(invitationId: string) {
    setPendingAction(invitationId);
    setProblem(undefined);
    try {
      const { data, error } = await createApiClient(apiUrl).DELETE(
        "/v1/organizations/{organizationId}/invitations/{invitationId}",
        {
          headers: await authorization(),
          params: { path: { organizationId, invitationId } },
        },
      );
      if (!data)
        throw new Error(error?.detail ?? "Invitation could not be revoked.");
      setInvitations((current) =>
        current.map((item) => (item.id === data.id ? data : item)),
      );
    } catch (error) {
      setProblem(
        error instanceof Error
          ? error.message
          : "Invitation could not be revoked.",
      );
    } finally {
      setPendingAction(undefined);
    }
  }

  return (
    <Card
      description="Invite people without consuming a seat until they accept."
      title="Team invitations"
    >
      <form className="grid gap-4" onSubmit={submit}>
        <FormField label="Email address" required>
          <Input
            autoComplete="email"
            name="emailAddress"
            onChange={(event) => setEmailAddress(event.target.value)}
            required
            type="email"
            value={emailAddress}
          />
        </FormField>
        <FormField label="Role" required>
          <Select
            label="Role"
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
          loadingLabel="Sending invitation"
          type="submit"
        >
          Send invitation
        </Button>
      </form>

      {problem ? (
        <div className="mt-5">
          <ErrorState description={problem} title="Invitation action failed" />
        </div>
      ) : null}

      <div className="mt-6 border-t border-border pt-5">
        {loading ? (
          <p className="text-sm text-muted" role="status">
            Loading invitations…
          </p>
        ) : invitations.length === 0 ? (
          <p className="text-sm text-muted">No invitations yet.</p>
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
                    {invitation.role} · {invitation.status}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {invitation.status === "pending" ? (
                    <Button
                      loading={pendingAction === invitation.id}
                      loadingLabel="Revoking invitation"
                      onClick={() => void revoke(invitation.id)}
                      size="sm"
                      type="button"
                      variant="danger"
                    >
                      Revoke
                    </Button>
                  ) : null}
                  {invitation.status === "expired" ||
                  invitation.status === "revoked" ? (
                    <Button
                      loading={pendingAction === invitation.id}
                      loadingLabel="Resending invitation"
                      onClick={() => void resend(invitation.id)}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      Resend
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
