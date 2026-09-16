import { expect, test } from "@playwright/test";
import { signInClerkTestUser } from "./clerk-fixtures";

test("visitor is redirected before protected content is rendered", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/sign-in(?:\/|\?|$)/);
  await expect(
    page.getByRole("heading", { name: "API contract is available" }),
  ).toHaveCount(0);
});

test("User signs in, reaches verified identity, and signs out", async ({
  page,
}) => {
  await signInClerkTestUser(page);

  await expect(
    page.getByRole("heading", { name: "Verified User" }),
  ).toBeVisible();
  await expect(page.getByTestId("authenticated-user-id")).toHaveText(/^user_/);

  await page.locator(".cl-userButtonTrigger").click();
  await page.getByRole("button", { name: /Sign out$/i }).click();
  await page.goto("/");

  await expect(page).toHaveURL(/\/sign-in(?:\/|\?|$)/);
});
