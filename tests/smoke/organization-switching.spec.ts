import { expect } from "@playwright/test";
import { authenticatedTest, ensureOrganizationPair } from "./clerk-fixtures";

authenticatedTest(
  "User switches the Active Organization without leaking the previous context between tabs",
  async ({ authenticatedPage: page }) => {
    const firstSlug = new URL(page.url()).pathname.split("/").at(-1)!;
    const organizations = await ensureOrganizationPair();
    const targetOrganization =
      firstSlug === organizations.secondary.slug
        ? organizations.primary
        : organizations.secondary;
    await page.reload();

    const otherTab = await page.context().newPage();
    await otherTab.goto(page.url());

    const switcher = page.getByRole("combobox", {
      name: "Active Organization",
    });
    await switcher.click();
    await expect
      .poll(() => page.getByRole("option").count())
      .toBeGreaterThanOrEqual(2);
    await page.getByRole("option", { name: targetOrganization.name }).click();

    await expect(page).toHaveURL(
      new RegExp(`/organizations/${targetOrganization.slug}$`),
    );
    await expect(page.getByTestId("active-organization-slug")).toHaveText(
      targetOrganization.slug,
    );
    await expect(otherTab).toHaveURL(
      new RegExp(`/organizations/${targetOrganization.slug}$`),
    );
    await expect(otherTab.getByTestId("active-organization-slug")).toHaveText(
      targetOrganization.slug,
    );

    await page.goto(`/organizations/${firstSlug}`);
    await expect(page).toHaveURL(new RegExp(`/organizations/${firstSlug}$`));
    await expect(page.getByTestId("active-organization-slug")).toHaveText(
      firstSlug,
    );
  },
);
