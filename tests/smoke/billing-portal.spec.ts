import { expect } from "@playwright/test";
import { authenticatedTest } from "./clerk-fixtures";

authenticatedTest(
  "shows pending, unavailable, and unauthorized Customer Portal states",
  async ({ authenticatedPage: page }) => {
    const endpoint = /\/v1\/organizations\/[^/]+\/billing\/portal-sessions$/;
    let releaseUnavailable!: () => void;
    const unavailable = new Promise<void>((resolve) => {
      releaseUnavailable = resolve;
    });

    await page.route(endpoint, async (route) => {
      await unavailable;
      await route.fulfill({
        contentType: "application/problem+json",
        status: 404,
        body: JSON.stringify({ title: "Customer Portal unavailable" }),
      });
    });

    await page.getByRole("button", { name: "Manage Subscription" }).click();
    await expect(
      page.getByRole("button", { name: "Opening Customer Portal" }),
    ).toBeDisabled();
    releaseUnavailable();
    await expect(page.getByRole("status")).toHaveText(
      "Customer Portal is currently unavailable.",
    );

    await page.unroute(endpoint);
    await page.route(endpoint, (route) =>
      route.fulfill({
        contentType: "application/problem+json",
        status: 403,
        body: JSON.stringify({ title: "Forbidden" }),
      }),
    );
    await page.getByRole("button", { name: "Manage Subscription" }).click();
    await expect(page.getByTestId("billing-portal-unauthorized")).toHaveText(
      "Only an Owner can open Customer Portal.",
    );
  },
);
