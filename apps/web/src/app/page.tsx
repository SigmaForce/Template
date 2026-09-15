import { createApiClient, type components } from "@saas/api-client";

type Money = components["schemas"]["MoneyDto"];

type ApiAvailability =
  | {
      available: true;
      example: {
        name: string;
        price: Money;
      };
    }
  | { available: false };

async function getApiAvailability(): Promise<ApiAvailability> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) {
    return { available: false };
  }

  try {
    const client = createApiClient(apiUrl);
    const { data } = await client.GET("/v1/contract-examples", {
      cache: "no-store",
      params: { query: { currency: "BRL", limit: 1 } },
      signal: AbortSignal.timeout(3_000),
    });

    const example = data?.items[0];

    if (!example) {
      return { available: false };
    }

    return { available: true, example };
  } catch {
    return { available: false };
  }
}

function formatMoney({ amountMinor, currency }: Money) {
  const negative = amountMinor.startsWith("-");
  const digits = (negative ? amountMinor.slice(1) : amountMinor).padStart(
    3,
    "0",
  );
  const whole = digits.slice(0, -2);
  const fraction = digits.slice(-2);

  return `${currency} ${negative ? "-" : ""}${whole}.${fraction}`;
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
            <h2>
              {api.available
                ? "API contract is available"
                : "API contract is unavailable"}
            </h2>
            <p>
              {api.available
                ? "The generated TypeScript client reached the versioned backend contract."
                : "Start the API or check NEXT_PUBLIC_API_URL, then try again."}
            </p>
            {api.available ? (
              <div className="contract-example">
                <span data-testid="contract-example-name">
                  {api.example.name}
                </span>
                <span data-testid="contract-example-price">
                  {formatMoney(api.example.price)}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
