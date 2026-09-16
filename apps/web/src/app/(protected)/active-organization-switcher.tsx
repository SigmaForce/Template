"use client";

import { useOrganization, useOrganizationList } from "@clerk/nextjs";
import { Select } from "@saas/ui";
import { useEffect, useState } from "react";

const activeOrganizationEventKey = "saas.active-organization.changed";
const organizationSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function organizationPath(slug: string) {
  return `/organizations/${encodeURIComponent(slug)}`;
}

export function ActiveOrganizationSwitcher() {
  const { organization } = useOrganization();
  const { isLoaded, setActive, userMemberships } = useOrganizationList({
    userMemberships: true,
  });
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    function followActiveOrganization(event: StorageEvent) {
      if (event.key !== activeOrganizationEventKey || !event.newValue) return;

      try {
        const value: unknown = JSON.parse(event.newValue);
        if (
          typeof value !== "object" ||
          value === null ||
          !("slug" in value) ||
          typeof value.slug !== "string" ||
          !organizationSlugPattern.test(value.slug)
        ) {
          return;
        }

        window.location.replace(organizationPath(value.slug));
      } catch {
        // Ignore malformed, client-controlled synchronization hints.
      }
    }

    window.addEventListener("storage", followActiveOrganization);
    return () =>
      window.removeEventListener("storage", followActiveOrganization);
  }, []);

  const memberships = userMemberships.data ?? [];
  const options = memberships.map((membership) => ({
    label: membership.organization.name,
    value: membership.organization.id,
  }));

  async function switchOrganization(organizationId: string | null) {
    if (!organizationId || organizationId === organization?.id || !setActive) {
      return;
    }
    const membership = memberships.find(
      (candidate) => candidate.organization.id === organizationId,
    );
    const slug = membership?.organization.slug;
    if (!slug || !organizationSlugPattern.test(slug)) {
      setError("This Organization does not have a valid navigation slug.");
      return;
    }

    setError(undefined);
    setSwitching(true);
    try {
      await setActive({ organization: organizationId });
      localStorage.setItem(
        activeOrganizationEventKey,
        JSON.stringify({ changedAt: Date.now(), slug }),
      );
      window.location.replace(organizationPath(slug));
    } catch {
      setError("The Active Organization could not be changed. Try again.");
      setSwitching(false);
    }
  }

  if (!isLoaded || userMemberships.isLoading) {
    return <span className="text-sm text-muted">Loading Organizations…</span>;
  }

  return (
    <div className="grid min-w-48 gap-1">
      <Select
        disabled={switching || options.length === 0}
        label="Active Organization"
        onValueChange={switchOrganization}
        options={options}
        placeholder="Select an Organization"
        size="sm"
        value={organization?.id ?? null}
      />
      {error ? (
        <span className="text-xs text-negative" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
