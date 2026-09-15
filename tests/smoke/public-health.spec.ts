import { expect, test } from "@playwright/test";

test("visitor sees data loaded through the generated API client", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "API contract is available" }),
  ).toBeVisible();
  await expect(page.getByTestId("contract-example-name")).toHaveText(
    "Foundation contract",
  );
  await expect(page.getByTestId("contract-example-price")).toHaveText(
    "BRL 49.00",
  );
});

test("operator can distinguish health and readiness across every process", async ({
  request,
}) => {
  const apiPort = process.env.API_PORT;
  const workerPort = process.env.WORKER_PORT;
  const correlationId = "smoke-across-processes";
  const headers = { "x-correlation-id": correlationId };

  const webHealth = await request.get("/api/health", { headers });
  expect(webHealth.ok()).toBe(true);
  expect(webHealth.headers()["x-correlation-id"]).toBe(correlationId);
  await expect(webHealth.json()).resolves.toEqual({
    service: "web",
    status: "healthy",
  });

  const webReadiness = await request.get("/api/ready", { headers });
  expect(webReadiness.ok()).toBe(true);
  expect(webReadiness.headers()["x-correlation-id"]).toBe(correlationId);
  await expect(webReadiness.json()).resolves.toMatchObject({
    service: "web",
    status: "ready",
    dependencies: expect.arrayContaining([
      { name: "api", critical: true, status: "up" },
      { name: "posthog", critical: false, status: "disabled" },
      { name: "sentry", critical: false, status: "disabled" },
    ]),
  });

  const apiReadiness = await request.get(
    `http://127.0.0.1:${apiPort}/v1/ready`,
    { headers },
  );
  expect(apiReadiness.ok()).toBe(true);
  expect(apiReadiness.headers()["x-correlation-id"]).toBe(correlationId);
  await expect(apiReadiness.json()).resolves.toMatchObject({
    service: "api",
    status: "ready",
  });

  const workerReadiness = await request.get(
    `http://127.0.0.1:${workerPort}/ready`,
    { headers },
  );
  expect(workerReadiness.ok()).toBe(true);
  expect(workerReadiness.headers()["x-correlation-id"]).toBe(correlationId);
  await expect(workerReadiness.json()).resolves.toMatchObject({
    service: "worker",
    status: "ready",
  });

  const workerHealth = await request.get(
    `http://127.0.0.1:${workerPort}/health`,
  );
  expect(workerHealth.ok()).toBe(true);
  await expect(workerHealth.json()).resolves.toEqual({
    service: "worker",
    status: "healthy",
  });
});
