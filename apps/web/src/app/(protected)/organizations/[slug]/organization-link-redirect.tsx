"use client";

import { useOrganizationList } from "@clerk/nextjs";
import { useEffect, useState } from "react";

export function OrganizationLinkRedirect({
  organizationId,
  slug,
}: {
  organizationId: string;
  slug: string;
}) {
  const { isLoaded, setActive } = useOrganizationList();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!isLoaded || !setActive) return;

    void setActive({ organization: organizationId })
      .then(() => window.location.replace(`/organizations/${slug}`))
      .catch(() => setFailed(true));
  }, [isLoaded, organizationId, setActive, slug]);

  return failed ? (
    <p role="alert">This Organization could not be activated. Try again.</p>
  ) : (
    <p role="status">Opening Organization…</p>
  );
}
