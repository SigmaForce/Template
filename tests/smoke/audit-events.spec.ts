import { expect } from "@playwright/test";
import { authenticatedTest } from "./clerk-fixtures";

authenticatedTest(
  "Owner reviews read-only Audit Events with pending and error states",
  async ({ authenticatedPage: page }) => {
    let releaseNextPage!: () => void;
    const nextPage = new Promise<void>((resolve) => {
      releaseNextPage = resolve;
    });

    await page.route(
      /\/v1\/organizations\/[^/]+\/audit-events(?:\?.*)?$/,
      async (route) => {
        const url = new URL(route.request().url());
        if (url.searchParams.has("cursor")) {
          await nextPage;
          await route.fulfill({
            contentType: "application/problem+json",
            status: 503,
            body: JSON.stringify({ detail: "Audit storage unavailable" }),
          });
          return;
        }
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            items: [
              {
                action: "organization.settings.update-requested",
                actor: { id: "user_owner", type: "user" },
                context: { changedFields: ["name"] },
                id: "018f0c4a-7b5d-7cc4-b3e1-5a6f8d9c1001",
                occurredAt: "2026-09-24T20:00:00.000Z",
                target: { id: "org_audit", type: "organization" },
              },
            ],
            pageInfo: { hasNextPage: true, nextCursor: "next-page" },
          }),
        });
      },
    );
    await page.reload();

    const auditEvents = page.getByRole("region", { name: "Audit Events" });
    await expect(auditEvents).toContainText(
      "organization.settings.update-requested",
    );
    await expect(auditEvents).toContainText("user user_owner");
    await expect(
      auditEvents.getByRole("button", { name: /edit|delete|remove/i }),
    ).toHaveCount(0);

    await auditEvents
      .getByRole("button", { name: "Load more Audit Events" })
      .click();
    await expect(
      auditEvents.getByRole("button", { name: "Loading more Audit Events" }),
    ).toBeDisabled();
    releaseNextPage();
    await expect(auditEvents).toContainText("Audit Events unavailable");
  },
);
