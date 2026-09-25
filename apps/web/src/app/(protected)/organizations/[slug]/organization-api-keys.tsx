"use client";

import { useAuth } from "@clerk/nextjs";
import { createApiClient, type components } from "@saas/api-client";
import { Button, Card, ErrorState } from "@saas/ui";
import { useEffect, useState } from "react";

type ApiKey = components["schemas"]["ApiKeyDto"];
type ApiKeyScope = components["schemas"]["CreateApiKeyDto"]["scopes"][number];

async function fetchApiKeys(
  apiUrl: string,
  organizationId: string,
  token: string,
) {
  const { data } = await createApiClient(apiUrl).GET(
    "/v1/organizations/{organizationId}/api-keys",
    {
      cache: "no-store",
      headers: { authorization: `Bearer ${token}` },
      params: { path: { organizationId } },
    },
  );
  if (!data) throw new Error("API Keys could not be loaded.");
  return data.items;
}

export function OrganizationApiKeys({
  apiUrl,
  canManage,
  organizationId,
}: {
  apiUrl: string;
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
  const [plaintext, setPlaintext] = useState<string>();
  const [problem, setProblem] = useState<string>();

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
    try {
      const { client, headers } = await authorizedClient();
      const { data } = await client.POST(
        "/v1/organizations/{organizationId}/api-keys",
        {
          headers,
          params: { path: { organizationId } },
          body: { name, scopes: [scope] },
        },
      );
      if (!data) throw new Error("API Key could not be created.");
      setPlaintext(data.plaintext);
      setName("");
      await load();
    } catch (error) {
      setProblem(
        error instanceof Error
          ? error.message
          : "API Key could not be created.",
      );
    }
  }

  async function rotate(apiKeyId: string) {
    setProblem(undefined);
    try {
      const { client, headers } = await authorizedClient();
      const { data } = await client.POST(
        "/v1/organizations/{organizationId}/api-keys/{apiKeyId}/rotate",
        {
          headers,
          params: { path: { apiKeyId, organizationId } },
        },
      );
      if (!data) throw new Error("API Key could not be rotated.");
      setPlaintext(data.plaintext);
      await load();
    } catch (error) {
      setProblem(
        error instanceof Error
          ? error.message
          : "API Key could not be rotated.",
      );
    }
  }

  async function revoke(apiKeyId: string) {
    setProblem(undefined);
    try {
      const { client, headers } = await authorizedClient();
      const { response } = await client.DELETE(
        "/v1/organizations/{organizationId}/api-keys/{apiKeyId}",
        { headers, params: { path: { apiKeyId, organizationId } } },
      );
      if (!response.ok) throw new Error("API Key could not be revoked.");
      setPlaintext(undefined);
      await load();
    } catch (error) {
      setProblem(
        error instanceof Error
          ? error.message
          : "API Key could not be revoked.",
      );
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
            {plaintext}
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
      <form
        className="mb-5 grid gap-3"
        onSubmit={(event) => void create(event)}
      >
        <label>
          Name
          <input
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
        <Button type="submit">Create API Key</Button>
      </form>
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
                  <Button
                    onClick={() => void rotate(apiKey.id)}
                    type="button"
                    variant="secondary"
                  >
                    Rotate {apiKey.name}
                  </Button>
                  <Button
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
