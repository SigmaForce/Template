import { clerk } from "@clerk/testing/playwright";
import { createClerkClient } from "@clerk/backend";
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

function clerkSecretKey() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      "CLERK_SECRET_KEY is required to provision Organization switching tests.",
    );
  }
  return secretKey;
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

async function ensureSecondOrganization() {
  const email = testUserEmail();
  const client = createClerkClient({ secretKey: clerkSecretKey() });
  const users = await client.users.getUserList({
    emailAddress: [email],
    limit: 1,
  });
  const user = users.data.find((candidate) =>
    candidate.emailAddresses.some(
      (address) => address.emailAddress.toLowerCase() === email.toLowerCase(),
    ),
  );
  if (!user) throw new Error(`The Clerk test User ${email} was not found.`);

  const defaultSlug = `foundation-${createHash("sha256")
    .update(`${email}:second`)
    .digest("hex")
    .slice(0, 12)}`;
  const slug = process.env.E2E_CLERK_SECOND_ORGANIZATION_SLUG ?? defaultSlug;
  const name = "Foundation E2E Secondary Organization";
  const memberships = await client.users.getOrganizationMembershipList({
    limit: 100,
    userId: user.id,
  });
  const existing = memberships.data.find(
    (membership) => membership.organization.slug === slug,
  );

  if (existing) {
    return {
      id: existing.organization.id,
      name: existing.organization.name,
      slug,
    };
  }

  const organization = await client.organizations.createOrganization({
    createdBy: user.id,
    name,
    slug,
  });
  await client.organizations.updateOrganizationMembership({
    organizationId: organization.id,
    role: "org:owner",
    userId: user.id,
  });

  return { id: organization.id, name: organization.name, slug };
}

export async function ensureOrganizationPair() {
  const secondary = await ensureSecondOrganization();
  const email = testUserEmail();
  const client = createClerkClient({ secretKey: clerkSecretKey() });
  const users = await client.users.getUserList({
    emailAddress: [email],
    limit: 1,
  });
  const user = users.data[0];
  if (!user) throw new Error(`The Clerk test User ${email} was not found.`);

  const memberships = await client.users.getOrganizationMembershipList({
    limit: 100,
    userId: user.id,
  });
  const primaryMembership = memberships.data.find(
    (membership) =>
      Boolean(membership.organization.slug) &&
      membership.organization.id !== secondary.id,
  );
  if (!primaryMembership?.organization.slug) {
    throw new Error(
      "The Clerk test User needs two Organizations with navigation slugs.",
    );
  }

  return {
    primary: {
      id: primaryMembership.organization.id,
      name: primaryMembership.organization.name,
      slug: primaryMembership.organization.slug,
    },
    secondary,
  };
}

export const authenticatedTest = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    await signInClerkTestUser(page);
    await ensureFirstOrganization(page);
    await use(page);
  },
});
