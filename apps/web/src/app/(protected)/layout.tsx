import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { AppShell } from "@saas/ui";
import type { ReactNode } from "react";
import { resolveSupportedLocale } from "../../organization-localization";
import { getOrganizationSettings } from "../../organization-settings";
import { ActiveOrganizationSwitcher } from "./active-organization-switcher";

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { getToken, isAuthenticated, orgId, redirectToSignIn } = await auth();

  if (!isAuthenticated) return redirectToSignIn();

  const token = orgId ? await getToken() : null;
  const settings =
    token && orgId
      ? await getOrganizationSettings(token, orgId)
      : { available: false as const };
  const locale = resolveSupportedLocale(
    settings.available ? settings.value.locale : undefined,
  );

  return (
    <AppShell
      account={<UserButton />}
      organization={<ActiveOrganizationSwitcher locale={locale} />}
    >
      {children}
    </AppShell>
  );
}
