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

test("operator can observe the independent worker process", async ({
  request,
}) => {
  const workerPort = process.env.WORKER_PORT;
  const response = await request.get(`http://127.0.0.1:${workerPort}/health`);

  expect(response.ok()).toBe(true);
  await expect(response.json()).resolves.toEqual({
    service: "worker",
    status: "ok",
  });
});
