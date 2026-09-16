import { cleanup, render } from "@testing-library/react";
import { page } from "vitest/browser";
import { afterEach, expect, test } from "vitest";
import {
  Badge,
  Breadcrumb,
  Button,
  Card,
  DataTable,
  ErrorState,
  ReadOnlyState,
  Tabs,
} from "../src";
import "../src/styles.css";

afterEach(() => {
  cleanup();
  delete document.documentElement.dataset.theme;
});

test("data display pattern remains stable in the light theme", async () => {
  document.documentElement.dataset.theme = "light";

  render(
    <main
      className="grid w-[48rem] gap-5 bg-canvas p-8 text-foreground"
      data-testid="data-pattern"
    >
      <Breadcrumb
        items={[
          { href: "/organizations", label: "Organizations" },
          { label: "Memberships" },
        ]}
      />
      <Card
        actions={<Badge tone="positive">Active</Badge>}
        description="Manage participation in the Active Organization."
        title="Northstar Organization"
      >
        <Tabs
          defaultValue="memberships"
          items={[
            { content: "Summary", label: "Overview", value: "overview" },
            {
              content: (
                <DataTable
                  actions={(row) => (
                    <Button aria-label={`Manage ${row.name}`} size="sm" variant="ghost">
                      Manage
                    </Button>
                  )}
                  caption="Memberships"
                  columns={[
                    { cell: (row) => row.name, header: "Membership", key: "name" },
                    {
                      cell: (row) => <Badge tone="positive">{row.status}</Badge>,
                      header: "Status",
                      key: "status",
                    },
                  ]}
                  getRowKey={(row) => row.id}
                  pagination={{
                    nextCursor: "opaque-next",
                    onNavigate: () => undefined,
                    previousCursor: null,
                  }}
                  rows={[
                    { id: "membership_1", name: "Alex Morgan", status: "Active" },
                    { id: "membership_2", name: "Jordan Lee", status: "Active" },
                  ]}
                />
              ),
              label: "Memberships",
              value: "memberships",
            },
          ]}
        />
      </Card>
    </main>,
  );

  await expect(page.getByTestId("data-pattern")).toMatchScreenshot(
    "data-pattern-light",
  );
});

test("failed and Read-only states remain stable in the dark theme", async () => {
  document.documentElement.dataset.theme = "dark";

  render(
    <main
      className="grid w-[42rem] gap-5 bg-canvas p-8 text-foreground"
      data-testid="product-states-pattern"
    >
      <ErrorState
        action={<Button variant="secondary">Try again</Button>}
        description="Memberships could not be loaded."
        title="Unable to load Memberships"
      />
      <ReadOnlyState
        action={<Button>Resolve billing</Button>}
        description="Existing data remains available, but changes are disabled."
      />
    </main>,
  );

  await expect(page.getByTestId("product-states-pattern")).toMatchScreenshot(
    "product-states-dark",
  );
});
