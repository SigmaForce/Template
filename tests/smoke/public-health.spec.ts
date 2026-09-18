import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { authenticatedTest } from "./clerk-fixtures";

authenticatedTest(
  "User sees data loaded through the generated API client",
  async ({ authenticatedPage: page }) => {
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
  },
);

authenticatedTest(
  "User can navigate the application shell by landmark and keyboard",
  async ({ authenticatedPage: page }) => {
    await page.goto("/");

    await expect(page.getByRole("banner")).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Primary navigation" }),
    ).toBeVisible();
    await expect(page.getByRole("main")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Northstar home" }),
    ).toBeVisible();
    await expect(
      page.getByText("Northstar Organization", { exact: true }),
    ).toBeVisible();

    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("link", { name: "Skip to content" }),
    ).toBeFocused();
  },
);

authenticatedTest(
  "User can follow the system theme and persist an explicit choice",
  async ({ authenticatedPage: page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");

    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    const theme = page.getByRole("combobox", { name: "Color theme" });
    await theme.selectOption("light");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(theme).toHaveValue("light");
  },
);

authenticatedTest(
  "User can operate mobile navigation with keyboard focus",
  async ({ authenticatedPage: page }) => {
    await page.setViewportSize({ width: 375, height: 720 });
    await page.goto("/");

    const trigger = page.getByRole("button", { name: "Open navigation" });
    await trigger.click();

    const dialog = page.getByRole("dialog", { name: "Navigation" });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("navigation", { name: "Mobile navigation" }),
    ).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => {
          const activeElement = document.activeElement;
          return Boolean(activeElement?.closest('[role="dialog"]'));
        }),
      )
      .toBe(true);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  },
);

authenticatedTest(
  "shell keeps its controls and content usable with expanded text",
  async ({ authenticatedPage: page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto("/");
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });

    await expect(
      page.getByRole("button", { name: "Open navigation" }),
    ).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: "Color theme" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "API contract is available" }),
    ).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
  },
);

for (const theme of ["light", "dark"] as const) {
  authenticatedTest(
    `${theme} theme has no automatically detectable accessibility violations`,
    async ({ authenticatedPage: page }) => {
      await page.addInitScript((selectedTheme) => {
        localStorage.setItem("northstar-theme", selectedTheme);
      }, theme);
      await page.goto("/");

      const results = await new AxeBuilder({ page }).analyze();

      expect(results.violations).toEqual([]);
    },
  );
}

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
