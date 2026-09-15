import { expect, test } from "@playwright/test";

test("visitor sees that the public application can reach the API", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "API is available" }),
  ).toBeVisible();
  await expect(page.getByTestId("api-service")).toHaveText("api");
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
