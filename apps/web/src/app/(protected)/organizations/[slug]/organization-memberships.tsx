"use client";

import { useAuth, useOrganizationList } from "@clerk/nextjs";
import { createApiClient, type components } from "@saas/api-client";
import { Button, Card, ErrorState, Select } from "@saas/ui";
import { useEffect, useState } from "react";

type Membership = components["schemas"]["MembershipDto"];
type MembershipRole = Membership["role"];
type MembershipUpdate = components["schemas"]["UpdateMembershipDto"];

const ownerRoleOptions = [
  { label: "Owner", value: "owner" },
  { label: "Admin", value: "admin" },
  { label: "Member", value: "member" },
];
const adminRoleOptions = ownerRoleOptions.slice(1);

async function fetchMembershipPage(
  apiUrl: string,
  organizationId: string,
  token: string,
  cursor?: string,
) {
  const { data, error } = await createApiClient(apiUrl).GET(
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
  if (!data)
    throw new Error(error?.detail ?? "Memberships could not be loaded.");
  return data;
}

export function OrganizationMemberships({
  actorRole,
  apiUrl,
  canManage,
  organizationId,
}: {
  actorRole: MembershipRole;
  apiUrl: string;
  canManage: boolean;
  organizationId: string;
}) {
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
          throw new Error("Your session is unavailable. Sign in again.");
        const page = await fetchMembershipPage(apiUrl, organizationId, token);
        if (active) {
          setMemberships(page.items);
          setNextCursor(page.pageInfo.nextCursor);
        }
      } catch (error) {
        if (active)
          setProblem(
            error instanceof Error
              ? error.message
              : "Memberships could not be loaded.",
          );
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [apiUrl, canManage, getToken, organizationId]);

  async function authorization() {
    const token = await getToken();
    if (!token) throw new Error("Your session is unavailable. Sign in again.");
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
        throw new Error("Your session is unavailable. Sign in again.");
      const page = await fetchMembershipPage(
        apiUrl,
        organizationId,
        token,
        nextCursor,
      );
      setMemberships((current) => [...current, ...page.items]);
      setNextCursor(page.pageInfo.nextCursor);
    } catch (error) {
      setProblem(
        error instanceof Error
          ? error.message
          : "Memberships could not be loaded.",
      );
    } finally {
      setPendingAction(undefined);
    }
  }

  async function update(userIdToUpdate: string, body: MembershipUpdate) {
    setPendingAction(userIdToUpdate);
    setProblem(undefined);
    try {
      const { data, error } = await createApiClient(apiUrl).PATCH(
        "/v1/organizations/{organizationId}/memberships/{userId}",
        {
          body,
          headers: await authorization(),
          params: { path: { organizationId, userId: userIdToUpdate } },
        },
      );
      if (!data)
        throw new Error(error?.detail ?? "Membership could not be updated.");
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
          : "Membership could not be updated.",
      );
    } finally {
      setPendingAction(undefined);
    }
  }

  async function remove(userIdToRemove: string) {
    const isSelf = userIdToRemove === userId;
    if (
      !window.confirm(
        isSelf ? "Leave this Organization?" : "Remove this Membership?",
      )
    )
      return;

    setPendingAction(userIdToRemove);
    setProblem(undefined);
    try {
      const { data, error } = await createApiClient(apiUrl).DELETE(
        "/v1/organizations/{organizationId}/memberships/{userId}",
        {
          headers: await authorization(),
          params: { path: { organizationId, userId: userIdToRemove } },
        },
      );
      if (!data)
        throw new Error(error?.detail ?? "Membership could not be removed.");
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
          : "Membership could not be removed.",
      );
    } finally {
      setPendingAction(undefined);
    }
  }

  if (!canManage) {
    return (
      <Card
        description="You can leave without deleting Organization data."
        title="Your Membership"
      >
        <p className="mb-4 text-sm capitalize text-muted">Role: {actorRole}</p>
        <Button
          loading={pendingAction === userId}
          loadingLabel="Leaving Organization"
          onClick={() => userId && void remove(userId)}
          type="button"
          variant="danger"
        >
          Leave Organization
        </Button>
        {problem ? (
          <div className="mt-5">
            <ErrorState
              description={problem}
              title="Membership action failed"
            />
          </div>
        ) : null}
      </Card>
    );
  }

  return (
    <Card
      description="Change Roles, suspend access, restore, or remove Memberships."
      title="Team Memberships"
    >
      {problem ? (
        <div className="mb-5">
          <ErrorState description={problem} title="Membership action failed" />
        </div>
      ) : null}
      {loading ? (
        <p className="text-sm text-muted" role="status">
          Loading Memberships…
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
                      {isSelf ? " (you)" : ""}
                    </strong>
                    <p className="mt-1 capitalize text-muted">
                      {membership.role} · {membership.status}
                    </p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,12rem)_1fr]">
                    <Select
                      disabled={
                        !canChange || pendingAction === membership.userId
                      }
                      label={`Role for ${membership.userId}`}
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
                              ? "Suspending Membership"
                              : "Restoring Membership"
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
                            ? "Suspend"
                            : "Restore"}
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
                          {isSelf ? "Leave" : "Remove Membership"}
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
              loadingLabel="Loading more Memberships"
              onClick={() => void loadMore()}
              type="button"
              variant="secondary"
            >
              Load more
            </Button>
          ) : null}
        </>
      )}
    </Card>
  );
}
