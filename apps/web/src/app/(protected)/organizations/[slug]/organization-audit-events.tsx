"use client";

import { useAuth } from "@clerk/nextjs";
import { createApiClient, type components } from "@saas/api-client";
import { Button, Card, ErrorState } from "@saas/ui";
import { useEffect, useState } from "react";

type AuditEvent = components["schemas"]["AuditEventDto"];

async function fetchAuditEvents(
  apiUrl: string,
  organizationId: string,
  token: string,
  cursor?: string,
) {
  const { data, error } = await createApiClient(apiUrl).GET(
    "/v1/organizations/{organizationId}/audit-events",
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
    throw new Error(error?.detail ?? "Audit Events could not be loaded.");
  return data;
}

export function OrganizationAuditEvents({
  apiUrl,
  canReview,
  organizationId,
}: {
  apiUrl: string;
  canReview: boolean;
  organizationId: string;
}) {
  const { getToken } = useAuth();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(canReview);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>();
  const [problem, setProblem] = useState<string>();

  useEffect(() => {
    if (!canReview) return;
    let active = true;

    void (async () => {
      try {
        const token = await getToken();
        if (!token)
          throw new Error("Your session is unavailable. Sign in again.");
        const page = await fetchAuditEvents(apiUrl, organizationId, token);
        if (active) {
          setEvents(page.items);
          setNextCursor(page.pageInfo.nextCursor);
        }
      } catch (error) {
        if (active)
          setProblem(
            error instanceof Error
              ? error.message
              : "Audit Events could not be loaded.",
          );
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [apiUrl, canReview, getToken, organizationId]);

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    setProblem(undefined);
    try {
      const token = await getToken();
      if (!token)
        throw new Error("Your session is unavailable. Sign in again.");
      const page = await fetchAuditEvents(
        apiUrl,
        organizationId,
        token,
        nextCursor,
      );
      setEvents((current) => [...current, ...page.items]);
      setNextCursor(page.pageInfo.nextCursor);
    } catch (error) {
      setProblem(
        error instanceof Error
          ? error.message
          : "Audit Events could not be loaded.",
      );
    } finally {
      setLoadingMore(false);
    }
  }

  if (!canReview) {
    return (
      <Card
        description="Only an Owner can review sensitive administrative activity."
        title="Audit Events"
      />
    );
  }

  return (
    <Card
      description="Immutable security-sensitive and administrative activity for this Organization."
      title="Audit Events"
    >
      {problem ? (
        <div className="mb-5">
          <ErrorState description={problem} title="Audit Events unavailable" />
        </div>
      ) : null}
      {loading ? (
        <p className="text-sm text-muted" role="status">
          Loading Audit Eventsâ€¦
        </p>
      ) : events.length ? (
        <>
          <ol className="grid gap-3">
            {events.map((event) => (
              <li
                className="grid gap-1 rounded-control border border-border p-3 text-sm"
                key={event.id}
              >
                <strong className="break-all text-foreground">
                  {event.action}
                </strong>
                <span className="break-all text-muted">
                  {event.actor.type} {event.actor.id} â†’ {event.target.type}{" "}
                  {event.target.id}
                </span>
                <time className="text-muted" dateTime={event.occurredAt}>
                  {new Date(event.occurredAt).toLocaleString()}
                </time>
              </li>
            ))}
          </ol>
          {nextCursor ? (
            <Button
              className="mt-4"
              loading={loadingMore}
              loadingLabel="Loading more Audit Events"
              onClick={() => void loadMore()}
              type="button"
              variant="secondary"
            >
              Load more Audit Events
            </Button>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-muted">No Audit Events recorded yet.</p>
      )}
    </Card>
  );
}
