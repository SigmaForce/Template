import { expect, test } from "@playwright/test";
import { ensureFirstOrganization, signInClerkTestUser } from "./clerk-fixtures";

test("visitor is redirected before protected content is rendered", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/sign-in(?:\/|\?|$)/);
  await expect(
    page.getByRole("heading", { name: "API contract is available" }),
  ).toHaveCount(0);
});

test("User signs in, creates the first Organization, and signs out", async ({
  page,
}) => {
  await signInClerkTestUser(page);
  await ensureFirstOrganization(page);

  await expect(
    page.getByRole("heading", { name: "Verified User" }),
  ).toBeVisible();
  await expect(page.getByTestId("authenticated-user-id")).toHaveText(/^user_/);
  await expect(
    page.getByRole("heading", { name: "Plan catalog" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Launch v1" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Scale v1" })).toBeVisible();
  await expect(
    page.getByRole("list", { name: "Launch Capabilities" }),
  ).toBeVisible();

  await page.locator(".cl-userButtonTrigger").click();
  await page.getByRole("button", { name: /Sign out$/i }).click();
  await page.goto("/");

  await expect(page).toHaveURL(/\/sign-in(?:\/|\?|$)/);
});
