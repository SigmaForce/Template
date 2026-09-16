import { clerk } from "@clerk/testing/playwright";
import { expect, test as base } from "@playwright/test";
import type { Page } from "@playwright/test";
import { createHash } from "node:crypto";

function testUserEmail() {
  const email = process.env.E2E_CLERK_USER_EMAIL;
  if (!email) {
    throw new Error(
      "E2E_CLERK_USER_EMAIL is required for authenticated Clerk tests.",
    );
  }
  return email;
}

export async function signInClerkTestUser(page: Page) {
  await page.goto("/sign-in");
  await clerk.signIn({ page, emailAddress: testUserEmail() });
  await page.goto("/");
}

export async function ensureFirstOrganization(page: Page) {
  const onboarding = page.getByRole("heading", {
    name: "Create your first Organization",
  });

  await expect
    .poll(
      async () =>
        (await onboarding.isVisible()) ||
        /\/organizations\/[a-z0-9-]+$/.test(page.url()),
    )
    .toBe(true);

  if (await onboarding.isVisible()) {
    const email = testUserEmail();
    const defaultSlug = `foundation-${createHash("sha256")
      .update(email)
      .digest("hex")
      .slice(0, 12)}`;
    const slug = process.env.E2E_CLERK_ORGANIZATION_SLUG ?? defaultSlug;

    await page
      .getByRole("textbox", { name: /Organization name/ })
      .fill("Foundation E2E Organization");
    await page
      .getByRole("textbox", { name: /Organization URL slug/ })
      .fill(slug);
    await page.getByRole("button", { name: "Create Organization" }).click();
    await page.waitForURL(new RegExp(`/organizations/${slug}$`));
  }

  await page.waitForURL(/\/organizations\/[a-z0-9-]+$/);
}

export const authenticatedTest = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    await signInClerkTestUser(page);
    await ensureFirstOrganization(page);
    await use(page);
  },
});
