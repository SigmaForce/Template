import { clerk } from "@clerk/testing/playwright";
import { test as base } from "@playwright/test";
import type { Page } from "@playwright/test";

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

export const authenticatedTest = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    await signInClerkTestUser(page);
    await use(page);
  },
});
