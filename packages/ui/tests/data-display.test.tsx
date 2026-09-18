import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { Avatar, Badge, Breadcrumb, Card, Tabs } from "../src";

afterEach(cleanup);

describe("data display and contextual navigation", () => {
  it("composes a labelled card with status and identity", () => {
    render(
      <Card
        actions={<button type="button">Manage</button>}
        description="Current commercial agreement."
        title="Organization summary"
      >
        <Avatar fallback="NA" name="Northstar Admin" />
        <Badge tone="positive">Active</Badge>
      </Card>,
    );

    const card = screen.getByRole("region", { name: "Organization summary" });
    expect(
      within(card).getByText("Current commercial agreement."),
    ).toBeTruthy();
    expect(within(card).getByLabelText("Northstar Admin")).toBeTruthy();
    expect(within(card).getByText("Active")).toBeTruthy();
    expect(within(card).getByRole("button", { name: "Manage" })).toBeTruthy();
  });

  it("marks the last breadcrumb as the current page", () => {
    render(
      <Breadcrumb
        items={[
          { href: "/organizations", label: "Organizations" },
          { href: "/organizations/northstar", label: "Northstar" },
          { label: "Memberships" },
        ]}
      />,
    );

    const navigation = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(within(navigation).getAllByRole("link")).toHaveLength(2);
    expect(
      within(navigation).getByText("Memberships").getAttribute("aria-current"),
    ).toBe("page");
  });

  it("moves between related tab panels with arrow keys", async () => {
    const user = userEvent.setup();

    render(
      <Tabs
        defaultValue="overview"
        items={[
          {
            content: "Organization health",
            label: "Overview",
            value: "overview",
          },
          {
            content: "Three active Memberships",
            label: "Memberships",
            value: "memberships",
          },
        ]}
      />,
    );

    const overview = screen.getByRole("tab", { name: "Overview" });
    overview.focus();
    await user.keyboard("{ArrowRight}");

    expect(
      screen
        .getByRole("tab", { name: "Memberships" })
        .getAttribute("aria-selected"),
    ).toBe("true");
    expect(
      screen.getByRole("tabpanel", { name: "Memberships" }).textContent,
    ).toContain("Three active Memberships");
  });
});
