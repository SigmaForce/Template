import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { AppShell } from "@saas/ui";
import type { ReactNode } from "react";

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { isAuthenticated, redirectToSignIn } = await auth();

  if (!isAuthenticated) return redirectToSignIn();

  return <AppShell account={<UserButton />}>{children}</AppShell>;
}
