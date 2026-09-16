import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getWebEnvironment } from "../../environment";
import { OrganizationOnboarding } from "./organization-onboarding";

export default async function OnboardingPage() {
  const { orgSlug } = await auth();
  if (orgSlug) redirect(`/organizations/${orgSlug}`);

  const environment = getWebEnvironment();
  return <OrganizationOnboarding apiUrl={environment.apiUrl.toString()} />;
}
