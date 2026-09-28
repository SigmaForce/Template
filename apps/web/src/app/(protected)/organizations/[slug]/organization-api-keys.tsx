"use client";

import { useAuth } from "@clerk/nextjs";
import { createApiClient, type components } from "@saas/api-client";
import { Button, Card, ErrorState } from "@saas/ui";
import { useEffect, useRef, useState } from "react";

type ApiKey = components["schemas"]["ApiKeyDto"];
type ApiKeyScope = components["schemas"]["CreateApiKeyDto"]["scopes"][number];

async function fetchApiKeys(
  apiUrl: string,
  organizationId: string,
  token: string,
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
    if (!data) throw new Error("API Keys could not be loaded.");
    apiKeys.push(...data.items);
    cursor = data.pageInfo.nextCursor ?? undefined;
  } while (cursor);
  return apiKeys;
}

export function OrganizationApiKeys({
  apiUrl,
  canIssue,
  canManage,
  organizationId,
}: {
  apiUrl: string;
  canIssue: boolean;
  canManage: boolean;
  organizationId: string;
}) {
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
    if (!token) throw new Error("Your session is unavailable. Sign in again.");
    return {
      client: createApiClient(apiUrl),
      headers: { authorization: `Bearer ${token}` },
    };
  }

  async function load() {
    const token = await getToken();
    if (!token) throw new Error("Your session is unavailable. Sign in again.");
    setApiKeys(await fetchApiKeys(apiUrl, organizationId, token));
  }

  useEffect(() => {
    if (!canManage) return;
    let active = true;
    void (async () => {
      try {
        const token = await getToken();
        if (!token)
          throw new Error("Your session is unavailable. Sign in again.");
        const items = await fetchApiKeys(apiUrl, organizationId, token);
        if (active) setApiKeys(items);
      } catch (error) {
        if (active)
          setProblem(
            error instanceof Error
              ? error.message
              : "API Keys could not be loaded.",
          );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [apiUrl, canManage, getToken, organizationId]);

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
      if (!data) throw new Error("API Key could not be created.");
      createIdempotencyKey.current = undefined;
      setPlaintext({ apiKeyId: data.apiKey.id, value: data.plaintext });
      setName("");
      await load();
    } catch (error) {
      setProblem(
        error instanceof Error
          ? error.message
          : "API Key could not be created.",
      );
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
      if (!data) throw new Error("API Key could not be rotated.");
      rotationIdempotencyKeys.current.delete(apiKeyId);
      setPlaintext({ apiKeyId: data.apiKey.id, value: data.plaintext });
      await load();
    } catch (error) {
      setProblem(
        error instanceof Error
          ? error.message
          : "API Key could not be rotated.",
      );
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
      if (!response.ok) throw new Error("API Key could not be revoked.");
      setPlaintext((current) =>
        current?.apiKeyId === apiKeyId ? undefined : current,
      );
      await load();
    } catch (error) {
      setProblem(
        error instanceof Error
          ? error.message
          : "API Key could not be revoked.",
      );
    } finally {
      setPending(false);
    }
  }

  if (!canManage) {
    return (
      <Card
        description="Only an Owner can manage machine credentials."
        title="API Keys"
      />
    );
  }

  return (
    <Card
      description="Organization-owned credentials for scoped machine access."
      title="API Keys"
    >
      {problem ? (
        <div className="mb-5">
          <ErrorState description={problem} title="API Keys unavailable" />
        </div>
      ) : null}
      {plaintext ? (
        <div className="mb-5 grid gap-3 rounded-control border border-border p-3">
          <strong>Copy this API Key now. It will not be shown again.</strong>
          <code className="break-all" data-testid="api-key-plaintext">
            {plaintext.value}
          </code>
          <Button
            onClick={() => setPlaintext(undefined)}
            type="button"
            variant="secondary"
          >
            Dismiss secret
          </Button>
        </div>
      ) : null}
      {canIssue ? (
        <form
          className="mb-5 grid gap-3"
          onSubmit={(event) => void create(event)}
        >
          <label>
            Name
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
            Scope
            <select
              disabled={pending}
              onChange={(event) => setScope(event.target.value as ApiKeyScope)}
              value={scope}
            >
              <option value="organization:audit-events:read">
                Read Audit Events
              </option>
              <option value="organization:settings:read">
                Read Organization settings
              </option>
            </select>
          </label>
          <Button disabled={pending} type="submit">
            Create API Key
          </Button>
        </form>
      ) : null}
      {loading ? (
        <p role="status">Loading API Keys...</p>
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
                  ? "Revoked"
                  : apiKey.expiresAt
                    ? "Rotation overlap"
                    : "Active"}
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
                      Rotate {apiKey.name}
                    </Button>
                  ) : null}
                  <Button
                    disabled={pending}
                    onClick={() => void revoke(apiKey.id)}
                    type="button"
                    variant="secondary"
                  >
                    Revoke {apiKey.name}
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p>No API Keys issued yet.</p>
      )}
    </Card>
  );
}
