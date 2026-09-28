"use client";

import { useAuth } from "@clerk/nextjs";
import { createApiClient, type components } from "@saas/api-client";
import { Button, Card, ErrorState } from "@saas/ui";
import { useEffect, useRef, useState } from "react";
import type { SupportedLocale } from "../../../../organization-localization";

type ApiKey = components["schemas"]["ApiKeyDto"];
type ApiKeyScope = components["schemas"]["CreateApiKeyDto"]["scopes"][number];

const copy = {
  "en-US": {
    active: "Active",
    create: "Create API Key",
    createError: "API Key could not be created.",
    description: "Organization-owned credentials for scoped machine access.",
    dismiss: "Dismiss secret",
    empty: "No API Keys issued yet.",
    errorTitle: "API Keys unavailable",
    loadError: "API Keys could not be loaded.",
    loading: "Loading API Keys...",
    name: "Name",
    overlap: "Rotation overlap",
    readAudit: "Read Audit Events",
    readSettings: "Read Organization settings",
    restricted: "Only an Owner can manage machine credentials.",
    revoke: "Revoke",
    revokeError: "API Key could not be revoked.",
    revoked: "Revoked",
    rotate: "Rotate",
    rotateError: "API Key could not be rotated.",
    scope: "Scope",
    secret: "Copy this API Key now. It will not be shown again.",
    session: "Your session is unavailable. Sign in again.",
    title: "API Keys",
  },
  "pt-BR": {
    active: "Ativa",
    create: "Criar chave de API",
    createError: "Não foi possível criar a chave de API.",
    description:
      "Credenciais da organização para acesso de máquina com escopo definido.",
    dismiss: "Ocultar segredo",
    empty: "Nenhuma chave de API emitida.",
    errorTitle: "Chaves de API indisponíveis",
    loadError: "Não foi possível carregar as chaves de API.",
    loading: "Carregando chaves de API...",
    name: "Nome",
    overlap: "Sobreposição de rotação",
    readAudit: "Ler eventos de auditoria",
    readSettings: "Ler configurações da organização",
    restricted:
      "Somente um proprietário pode gerenciar credenciais de máquina.",
    revoke: "Revogar",
    revokeError: "Não foi possível revogar a chave de API.",
    revoked: "Revogada",
    rotate: "Rotacionar",
    rotateError: "Não foi possível rotacionar a chave de API.",
    scope: "Escopo",
    secret: "Copie esta chave de API agora. Ela não será exibida novamente.",
    session: "Sua sessão está indisponível. Entre novamente.",
    title: "Chaves de API",
  },
} as const;

async function fetchApiKeys(
  apiUrl: string,
  organizationId: string,
  token: string,
  errorMessage: string,
) {
  const client = createApiClient(apiUrl);
  const apiKeys: ApiKey[] = [];
  let cursor: string | undefined;
  do {
    const { data } = await client.GET(
      "/v1/organizations/{organizationId}/api-keys",
      {
        cache: "no-store",
        headers: { authorization: `Bearer ${token}` },
        params: { path: { organizationId }, query: { cursor, limit: 100 } },
      },
    );
    if (!data) throw new Error(errorMessage);
    apiKeys.push(...data.items);
    cursor = data.pageInfo.nextCursor ?? undefined;
  } while (cursor);
  return apiKeys;
}

export function OrganizationApiKeys({
  apiUrl,
  canIssue,
  canManage,
  locale,
  organizationId,
}: {
  apiUrl: string;
  canIssue: boolean;
  canManage: boolean;
  locale: SupportedLocale;
  organizationId: string;
}) {
  const messages = copy[locale];
  const { getToken } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(canManage);
  const [name, setName] = useState("");
  const [scope, setScope] = useState<ApiKeyScope>(
    "organization:audit-events:read",
  );
  const [plaintext, setPlaintext] = useState<{
    apiKeyId: string;
    value: string;
  }>();
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<string>();
  const createIdempotencyKey = useRef<string | undefined>(undefined);
  const rotationIdempotencyKeys = useRef(new Map<string, string>());

  async function authorizedClient() {
    const token = await getToken();
    if (!token) throw new Error(messages.session);
    return {
      client: createApiClient(apiUrl),
      headers: { authorization: `Bearer ${token}` },
    };
  }

  async function load() {
    const token = await getToken();
    if (!token) throw new Error(messages.session);
    setApiKeys(
      await fetchApiKeys(apiUrl, organizationId, token, messages.loadError),
    );
  }

  useEffect(() => {
    if (!canManage) return;
    let active = true;
    void (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error(messages.session);
        const items = await fetchApiKeys(
          apiUrl,
          organizationId,
          token,
          messages.loadError,
        );
        if (active) setApiKeys(items);
      } catch (error) {
        if (active)
          setProblem(
            error instanceof Error ? error.message : messages.loadError,
          );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [apiUrl, canManage, getToken, messages, organizationId]);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProblem(undefined);
    setPending(true);
    try {
      const idempotencyKey = (createIdempotencyKey.current ??=
        crypto.randomUUID());
      const { client, headers } = await authorizedClient();
      const { data } = await client.POST(
        "/v1/organizations/{organizationId}/api-keys",
        {
          headers,
          params: {
            header: { "Idempotency-Key": idempotencyKey },
            path: { organizationId },
          },
          body: { name, scopes: [scope] },
        },
      );
      if (!data) throw new Error(messages.createError);
      createIdempotencyKey.current = undefined;
      setPlaintext({ apiKeyId: data.apiKey.id, value: data.plaintext });
      setName("");
      await load();
    } catch (error) {
      setProblem(error instanceof Error ? error.message : messages.createError);
    } finally {
      setPending(false);
    }
  }

  async function rotate(apiKeyId: string) {
    setProblem(undefined);
    setPending(true);
    try {
      const idempotencyKey =
        rotationIdempotencyKeys.current.get(apiKeyId) ?? crypto.randomUUID();
      rotationIdempotencyKeys.current.set(apiKeyId, idempotencyKey);
      const { client, headers } = await authorizedClient();
      const { data } = await client.POST(
        "/v1/organizations/{organizationId}/api-keys/{apiKeyId}/rotate",
        {
          headers,
          params: {
            header: { "Idempotency-Key": idempotencyKey },
            path: { apiKeyId, organizationId },
          },
        },
      );
      if (!data) throw new Error(messages.rotateError);
      rotationIdempotencyKeys.current.delete(apiKeyId);
      setPlaintext({ apiKeyId: data.apiKey.id, value: data.plaintext });
      await load();
    } catch (error) {
      setProblem(error instanceof Error ? error.message : messages.rotateError);
    } finally {
      setPending(false);
    }
  }

  async function revoke(apiKeyId: string) {
    setProblem(undefined);
    setPending(true);
    try {
      const { client, headers } = await authorizedClient();
      const { response } = await client.DELETE(
        "/v1/organizations/{organizationId}/api-keys/{apiKeyId}",
        { headers, params: { path: { apiKeyId, organizationId } } },
      );
      if (!response.ok) throw new Error(messages.revokeError);
      setPlaintext((current) =>
        current?.apiKeyId === apiKeyId ? undefined : current,
      );
      await load();
    } catch (error) {
      setProblem(error instanceof Error ? error.message : messages.revokeError);
    } finally {
      setPending(false);
    }
  }

  if (!canManage) {
    return <Card description={messages.restricted} title={messages.title} />;
  }

  return (
    <Card description={messages.description} title={messages.title}>
      {problem ? (
        <div className="mb-5">
          <ErrorState description={problem} title={messages.errorTitle} />
        </div>
      ) : null}
      {plaintext ? (
        <div className="mb-5 grid gap-3 rounded-control border border-border p-3">
          <strong>{messages.secret}</strong>
          <code className="break-all" data-testid="api-key-plaintext">
            {plaintext.value}
          </code>
          <Button
            onClick={() => setPlaintext(undefined)}
            type="button"
            variant="secondary"
          >
            {messages.dismiss}
          </Button>
        </div>
      ) : null}
      {canIssue ? (
        <form
          className="mb-5 grid gap-3"
          onSubmit={(event) => void create(event)}
        >
          <label>
            {messages.name}
            <input
              disabled={pending}
              maxLength={100}
              minLength={1}
              onChange={(event) => setName(event.target.value)}
              required
              value={name}
            />
          </label>
          <label>
            {messages.scope}
            <select
              disabled={pending}
              onChange={(event) => setScope(event.target.value as ApiKeyScope)}
              value={scope}
            >
              <option value="organization:audit-events:read">
                {messages.readAudit}
              </option>
              <option value="organization:settings:read">
                {messages.readSettings}
              </option>
            </select>
          </label>
          <Button disabled={pending} type="submit">
            {messages.create}
          </Button>
        </form>
      ) : null}
      {loading ? (
        <p role="status">{messages.loading}</p>
      ) : apiKeys.length ? (
        <ul className="grid gap-3">
          {apiKeys.map((apiKey) => (
            <li
              className="grid gap-2 rounded-control border border-border p-3"
              key={apiKey.id}
            >
              <strong>{apiKey.name}</strong>
              <span className="break-all text-sm text-muted">
                {apiKey.scopes.join(", ")}
              </span>
              <span className="text-sm text-muted">
                {apiKey.revokedAt
                  ? messages.revoked
                  : apiKey.expiresAt
                    ? messages.overlap
                    : messages.active}
              </span>
              {!apiKey.revokedAt && !apiKey.expiresAt ? (
                <div className="flex gap-2">
                  {canIssue ? (
                    <Button
                      disabled={pending}
                      onClick={() => void rotate(apiKey.id)}
                      type="button"
                      variant="secondary"
                    >
                      {messages.rotate} {apiKey.name}
                    </Button>
                  ) : null}
                  <Button
                    disabled={pending}
                    onClick={() => void revoke(apiKey.id)}
                    type="button"
                    variant="secondary"
                  >
                    {messages.revoke} {apiKey.name}
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p>{messages.empty}</p>
      )}
    </Card>
  );
}
