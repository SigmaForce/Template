type ApiHealth = {
  service: "api";
  status: "ok";
};

type ApiAvailability =
  { available: true; health: ApiHealth } | { available: false };

async function getApiAvailability(): Promise<ApiAvailability> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) {
    return { available: false };
  }

  try {
    const response = await fetch(`${apiUrl}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3_000),
    });

    if (!response.ok) {
      return { available: false };
    }

    const health = (await response.json()) as ApiHealth;

    if (health.service !== "api" || health.status !== "ok") {
      return { available: false };
    }

    return { available: true, health };
  } catch {
    return { available: false };
  }
}

export default async function Home() {
  const api = await getApiAvailability();

  return (
    <main className="page-shell">
      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">Next + Nest SaaS Starter</p>
        <h1 id="page-title">A dependable starting point for B2B SaaS.</h1>
        <p className="lede">
          Web, API, worker, PostgreSQL, and Redis are composed as independent
          services in one focused monorepo.
        </p>

        <div
          className="status-card"
          data-available={api.available}
          role="status"
        >
          <span className="status-dot" aria-hidden="true" />
          <div>
            <h2>{api.available ? "API is available" : "API is unavailable"}</h2>
            <p>
              {api.available
                ? "The public application reached the backend successfully."
                : "Start the API or check NEXT_PUBLIC_API_URL, then try again."}
            </p>
            {api.available ? (
              <span className="service-name" data-testid="api-service">
                {api.health.service}
              </span>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
