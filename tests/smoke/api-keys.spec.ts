import { expect } from "@playwright/test";
import { authenticatedTest } from "./clerk-fixtures";

authenticatedTest(
  "Owner creates, rotates, and revokes an API Key with one-time secret display",
  async ({ authenticatedPage: page }) => {
    const now = "2026-09-25T12:00:00.000Z";
    let apiKeys = [
      {
        createdAt: now,
        expiresAt: null,
        id: "key_existing",
        name: "Existing",
        organizationId: "org_test",
        revokedAt: null,
        scopes: ["organization:audit-events:read"],
      },
    ];
    await page.route(
      /\/v1\/organizations\/[^/]+\/api-keys(?:\/.*)?$/,
      async (route) => {
        const request = route.request();
        const url = new URL(request.url());
        const segments = url.pathname.split("/");
        const apiKeyId =
          segments.at(-1) === "rotate" ? segments.at(-2) : segments.at(-1);

        if (request.method() === "GET") {
          await route.fulfill({
            contentType: "application/json",
            body: JSON.stringify({ items: apiKeys }),
          });
          return;
        }
        if (request.method() === "DELETE") {
          apiKeys = apiKeys.map((apiKey) =>
            apiKey.id === apiKeyId ? { ...apiKey, revokedAt: now } : apiKey,
          );
          await route.fulfill({ status: 204 });
          return;
        }

        const rotating = segments.at(-1) === "rotate";
        const apiKey = {
          createdAt: now,
          expiresAt: null,
          id: rotating ? "key_rotated" : "key_created",
          name: rotating ? "Existing" : "Automation",
          organizationId: "org_test",
          revokedAt: null,
          scopes: ["organization:audit-events:read"],
        };
        if (rotating) {
          apiKeys = apiKeys.map((current) =>
            current.id === apiKeyId ? { ...current, expiresAt: now } : current,
          );
        }
        apiKeys = [apiKey, ...apiKeys];
        await route.fulfill({
          contentType: "application/json",
          status: 201,
          body: JSON.stringify({
            apiKey,
            plaintext: rotating ? "sak_rotated-once" : "sak_created-once",
          }),
        });
      },
    );
    await page.reload();

    const card = page.getByRole("region", { name: "API Keys" });
    await expect(card).toContainText("Existing");
    await card.getByLabel("Name").fill("Automation");
    await card.getByRole("button", { name: "Create API Key" }).click();
    await expect(card.getByTestId("api-key-plaintext")).toHaveText(
      "sak_created-once",
    );
    await card.getByRole("button", { name: "Dismiss secret" }).click();
    await expect(card).not.toContainText("sak_created-once");

    await card.getByRole("button", { name: "Rotate Existing" }).click();
    await expect(card.getByTestId("api-key-plaintext")).toHaveText(
      "sak_rotated-once",
    );
    await card.getByRole("button", { name: "Revoke Existing" }).click();
    await expect(card).not.toContainText("sak_rotated-once");
    await expect(card).toContainText("Revoked");
  },
);
