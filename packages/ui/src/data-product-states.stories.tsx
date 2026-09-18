import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { expect } from "storybook/test";
import { Avatar } from "./avatar";
import { Badge } from "./badge";
import { Breadcrumb } from "./breadcrumb";
import { Button } from "./button";
import { Card } from "./card";
import { DataTable } from "./data-table";
import {
  EmptyState,
  ErrorState,
  ForbiddenState,
  LoadingState,
  ReadOnlyState,
} from "./product-states";
import { Tabs } from "./tabs";

interface MembershipRow {
  id: string;
  name: string;
  role: string;
  status: "Active" | "Suspended";
}

const membershipRows: MembershipRow[] = [
  { id: "membership_1", name: "Alex Morgan", role: "Owner", status: "Active" },
  { id: "membership_2", name: "Jordan Lee", role: "Admin", status: "Active" },
  {
    id: "membership_3",
    name: "Taylor Rivera",
    role: "Member",
    status: "Suspended",
  },
];

function MembershipTable({
  empty = false,
  extreme = false,
}: {
  empty?: boolean;
  extreme?: boolean;
}) {
  const [navigation, setNavigation] = useState("No cursor requested.");
  const rows = empty
    ? []
    : membershipRows.map((row) => ({
        ...row,
        name: extreme
          ? `${row.name} — Membership with an intentionally long identity label for reflow review`
          : row.name,
      }));

  return (
    <div className="grid gap-3">
      <DataTable
        actions={(row) => (
          <Button aria-label={`Manage ${row.name}`} size="sm" variant="ghost">
            Manage
          </Button>
        )}
        caption="Organization Memberships"
        columns={[
          {
            cell: (row) => (
              <div className="flex min-w-64 items-center gap-3">
                <Avatar
                  fallback={row.name.slice(0, 2).toUpperCase()}
                  name={row.name}
                  size="sm"
                />
                <span className="font-bold">{row.name}</span>
              </div>
            ),
            header: "Membership",
            key: "membership",
          },
          { cell: (row) => row.role, header: "Role", key: "role" },
          {
            cell: (row) => (
              <Badge tone={row.status === "Active" ? "positive" : "negative"}>
                {row.status}
              </Badge>
            ),
            header: "Status",
            key: "status",
          },
        ]}
        emptyContent="No Memberships match the current filters."
        getRowKey={(row) => row.id}
        pagination={{
          nextCursor: empty ? null : "opaque-next-cursor",
          onNavigate: (_cursor, direction) =>
            setNavigation(`Requested ${direction} results.`),
          previousCursor: null,
        }}
        rows={rows}
      />
      <p aria-live="polite" className="text-sm text-muted">
        {navigation}
      </p>
    </div>
  );
}

function DataShowcase({
  empty = false,
  extreme = false,
}: {
  empty?: boolean;
  extreme?: boolean;
}) {
  const summary = extreme
    ? "This intentionally long Organization summary demonstrates extensive data, contextual navigation, and controls without truncating essential information at narrow widths."
    : "Manage participation in the Active Organization.";

  return (
    <main className="mx-auto grid min-w-0 max-w-6xl gap-6 p-5 sm:p-8">
      <Breadcrumb
        items={[
          { href: "/organizations", label: "Organizations" },
          { href: "/organizations/northstar", label: "Northstar" },
          { label: "Memberships" },
        ]}
      />
      <Card
        actions={<Badge tone="positive">Active Organization</Badge>}
        description={summary}
        title="Northstar Organization"
      >
        <Tabs
          defaultValue="memberships"
          items={[
            {
              content: (
                <p className="text-muted">
                  Organization profile and operational summary.
                </p>
              ),
              label: "Overview",
              value: "overview",
            },
            {
              content: <MembershipTable empty={empty} extreme={extreme} />,
              label: "Memberships",
              value: "memberships",
            },
            {
              content: (
                <p className="text-muted">
                  Permission assignments are managed by Role.
                </p>
              ),
              label: "Permissions",
              value: "permissions",
            },
          ]}
        />
      </Card>
    </main>
  );
}

function ProductStateShowcase({ extreme = false }: { extreme?: boolean }) {
  const detail = extreme
    ? "A long explanation remains readable while preserving the recovery action and canonical Organization language when content expands significantly."
    : "The requested operation could not be completed.";

  return (
    <main className="mx-auto grid max-w-5xl gap-6 p-5 sm:grid-cols-2 sm:p-8">
      <LoadingState
        description="Retrieving Memberships for the Active Organization."
        label="Loading Memberships"
      />
      <EmptyState
        action={<Button>Invite User</Button>}
        description="No Memberships match the current filters."
        title="No Memberships found"
      />
      <ErrorState
        action={<Button variant="secondary">Try again</Button>}
        description={detail}
        title="Unable to load Memberships"
      />
      <ForbiddenState
        action={
          <Button variant="secondary">Choose another Organization</Button>
        }
        description="Your Membership does not have Permission to view this area."
      />
      <ReadOnlyState
        action={<Button>Resolve billing</Button>}
        className="sm:col-span-2"
        description="Existing data remains available, but changes to domain state are disabled."
      />
    </main>
  );
}

const meta = {
  component: DataShowcase,
  parameters: {
    docs: {
      description: {
        component:
          "Data display, opaque cursor navigation and reusable operational states for Organization product areas.",
      },
    },
  },
  title: "Foundations/Data and product states",
} satisfies Meta<typeof DataShowcase>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {};

export const DarkTheme: Story = {
  globals: { theme: "dark" },
};

export const EmptyData: Story = {
  args: { empty: true },
};

export const ProductStates: Story = {
  render: () => <ProductStateShowcase />,
};

export const FailedAndExtensiveStates: Story = {
  render: () => <ProductStateShowcase extreme />,
};

export const MobileAt200Percent: Story = {
  args: { extreme: true },
  globals: {
    textScale: "expanded",
    viewport: { isRotated: false, value: "mobile2" },
  },
};

export const KeyboardNavigation: Story = {
  play: async ({ canvas, userEvent }) => {
    const memberships = canvas.getByRole("tab", { name: "Memberships" });
    memberships.focus();
    await userEvent.keyboard("{ArrowRight}{ArrowLeft}");
    await expect(memberships).toHaveFocus();
    await expect(memberships).toHaveAttribute("aria-selected", "true");

    const next = canvas.getByRole("button", { name: "Next results" });
    next.focus();
    await userEvent.keyboard("{Enter}");
    await expect(canvas.getByText("Requested next results.")).toBeVisible();
  },
};
