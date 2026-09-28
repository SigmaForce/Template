"use client";

import { useAuth } from "@clerk/nextjs";
import { createApiClient, type components } from "@saas/api-client";
import { Button, Card, ErrorState } from "@saas/ui";
import { useEffect, useState } from "react";
import {
  formatInstant,
  type SupportedLocale,
} from "../../../../organization-localization";

type AuditEvent = components["schemas"]["AuditEventDto"];

const copy = {
  "en-US": {
    description:
      "Immutable security-sensitive and administrative activity for this Organization.",
    empty: "No Audit Events recorded yet.",
    error: "Audit Events could not be loaded.",
    errorTitle: "Audit Events unavailable",
    loadMore: "Load more Audit Events",
    loading: "Loading Audit Events…",
    loadingMore: "Loading more Audit Events",
    restricted: "Only an Owner can review sensitive administrative activity.",
    session: "Your session is unavailable. Sign in again.",
    title: "Audit Events",
  },
  "pt-BR": {
    description:
      "Atividade administrativa e sensível à segurança, preservada para esta organização.",
    empty: "Nenhum evento de auditoria registrado.",
    error: "Não foi possível carregar os eventos de auditoria.",
    errorTitle: "Eventos de auditoria indisponíveis",
    loadMore: "Carregar mais eventos de auditoria",
    loading: "Carregando eventos de auditoria…",
    loadingMore: "Carregando mais eventos de auditoria",
    restricted:
      "Somente um proprietário pode revisar atividades administrativas sensíveis.",
    session: "Sua sessão está indisponível. Entre novamente.",
    title: "Eventos de auditoria",
  },
} as const;

async function fetchAuditEvents(
  apiUrl: string,
  organizationId: string,
  token: string,
  errorMessage: string,
  cursor?: string,
) {
  const { data } = await createApiClient(apiUrl).GET(
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
  if (!data) throw new Error(errorMessage);
  return data;
}

export function OrganizationAuditEvents({
  apiUrl,
  canReview,
  locale,
  organizationId,
  timeZone,
}: {
  apiUrl: string;
  canReview: boolean;
  locale: SupportedLocale;
  organizationId: string;
  timeZone: string;
}) {
  const messages = copy[locale];
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
        if (!token) throw new Error(messages.session);
        const page = await fetchAuditEvents(
          apiUrl,
          organizationId,
          token,
          messages.error,
        );
        if (active) {
          setEvents(page.items);
          setNextCursor(page.pageInfo.nextCursor);
        }
      } catch (error) {
        if (active)
          setProblem(error instanceof Error ? error.message : messages.error);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [apiUrl, canReview, getToken, messages, organizationId]);

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    setProblem(undefined);
    try {
      const token = await getToken();
      if (!token) throw new Error(messages.session);
      const page = await fetchAuditEvents(
        apiUrl,
        organizationId,
        token,
        messages.error,
        nextCursor,
      );
      setEvents((current) => [...current, ...page.items]);
      setNextCursor(page.pageInfo.nextCursor);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : messages.error);
    } finally {
      setLoadingMore(false);
    }
  }

  if (!canReview) {
    return <Card description={messages.restricted} title={messages.title} />;
  }

  return (
    <Card description={messages.description} title={messages.title}>
      {problem ? (
        <div className="mb-5">
          <ErrorState description={problem} title={messages.errorTitle} />
        </div>
      ) : null}
      {loading ? (
        <p className="text-sm text-muted" role="status">
          {messages.loading}
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
                  {event.actor.type} {event.actor.id} → {event.target.type}{" "}
                  {event.target.id}
                </span>
                <time className="text-muted" dateTime={event.occurredAt}>
                  {formatInstant(event.occurredAt, locale, timeZone)}
                </time>
              </li>
            ))}
          </ol>
          {nextCursor ? (
            <Button
              className="mt-4"
              loading={loadingMore}
              loadingLabel={messages.loadingMore}
              onClick={() => void loadMore()}
              type="button"
              variant="secondary"
            >
              {messages.loadMore}
            </Button>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-muted">{messages.empty}</p>
      )}
    </Card>
  );
}
