import { expect } from "@playwright/test";
import { authenticatedTest } from "./clerk-fixtures";

authenticatedTest(
  "Owner suspends and restores a Membership through the web UI",
  async ({ authenticatedPage: page }) => {
    let status: "active" | "suspended" = "active";

    await page.route(
      /\/v1\/organizations\/[^/]+\/memberships(?:\/[^/?]+)?(?:\?.*)?$/,
      async (route) => {
        if (route.request().method() === "GET") {
          await route.fulfill({
            contentType: "application/json",
            body: JSON.stringify({
              items: [
                { userId: "user_membership_target", role: "member", status },
              ],
              pageInfo: { hasNextPage: false, nextCursor: null },
            }),
          });
          return;
        }

        const body = route.request().postDataJSON() as {
          status: "active" | "suspended";
        };
        status = body.status;
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            userId: "user_membership_target",
            role: "member",
            status,
          }),
        });
      },
    );
    await page.reload();

    const membership = page
      .getByRole("region", { name: "Team Memberships" })
      .locator("li")
      .filter({ hasText: "user_membership_target" });
    await membership.getByRole("button", { name: "Suspend" }).click();
    await expect(membership).toContainText("member · suspended");

    await membership.getByRole("button", { name: "Restore" }).click();
    await expect(membership).toContainText("member · active");
  },
);

authenticatedTest.describe("integrated Membership Suspension", () => {
  const targetUserId = process.env.E2E_MEMBERSHIP_TARGET_USER_ID;
  authenticatedTest.skip(
    !targetUserId,
    "E2E_MEMBERSHIP_TARGET_USER_ID must identify a non-Owner Membership in the test Organization.",
  );

  authenticatedTest(
    "suspends and restores a real Membership through Next.js, NestJS, and PostgreSQL",
    async ({ authenticatedPage: page }) => {
      const membership = () =>
        page
          .getByRole("region", { name: "Team Memberships" })
          .locator("li")
          .filter({ hasText: targetUserId! });
      const initiallySuspended = await membership()
        .getByRole("button", { name: "Restore" })
        .isVisible();

      try {
        if (initiallySuspended) {
          await membership().getByRole("button", { name: "Restore" }).click();
        }
        await membership().getByRole("button", { name: "Suspend" }).click();
        await expect(membership()).toContainText("suspended");
        await page.reload();
        await expect(membership()).toContainText("suspended");
      } finally {
        const isSuspended = await membership()
          .getByRole("button", { name: "Restore" })
          .isVisible();
        if (initiallySuspended && !isSuspended) {
          await membership().getByRole("button", { name: "Suspend" }).click();
        } else if (!initiallySuspended && isSuspended) {
          await membership().getByRole("button", { name: "Restore" }).click();
        }
      }
    },
  );
});
