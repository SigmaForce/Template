import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button, Dropdown, ToastProvider, Tooltip, useToast } from "../src";

afterEach(cleanup);

function ToastFixture() {
  const toast = useToast();

  return (
    <Button
      onClick={() =>
        toast.add({
          description: "The new settings are active.",
          priority: "high",
          timeout: 0,
          title: "Organization saved",
        })
      }
    >
      Save Organization
    </Button>
  );
}

describe("menus and feedback", () => {
  it("navigates dropdown actions with arrow keys and restores trigger focus", async () => {
    const user = userEvent.setup();
    const archive = vi.fn();

    render(
      <Dropdown
        items={[
          { label: "Rename", onSelect: vi.fn() },
          { label: "Archive", onSelect: archive },
        ]}
        trigger={<Button variant="secondary">Organization actions</Button>}
      />,
    );

    const trigger = screen.getByRole("button", {
      name: "Organization actions",
    });
    trigger.focus();
    await user.keyboard("{Enter}");

    const rename = screen.getByRole("menuitem", { name: "Rename" });
    expect(document.activeElement).toBe(rename);

    await user.keyboard("{ArrowDown}{Enter}");
    expect(archive).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(trigger);
  });

  it("shows tooltip help on focus and dismisses it with Escape", async () => {
    const user = userEvent.setup();

    render(
      <Tooltip
        accessibleLabel="Security policy — only Owners can change this setting"
        content="Only Owners can change this setting."
      >
        <Button variant="secondary">Security policy</Button>
      </Tooltip>,
    );

    await user.tab();
    expect(
      screen.getByRole("button", {
        name: "Security policy — only Owners can change this setting",
      }),
    ).toBeTruthy();
    expect(
      await screen.findByText("Only Owners can change this setting."),
    ).toBeTruthy();

    await user.keyboard("{Escape}");
    expect(
      screen.queryByText("Only Owners can change this setting."),
    ).toBeNull();
  });

  it("announces urgent toast feedback and keeps it keyboard reachable", async () => {
    const user = userEvent.setup();

    render(
      <ToastProvider>
        <ToastFixture />
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Save Organization" }));

    const announcement = await screen.findByRole("alert");
    expect(announcement.textContent).toContain("Organization saved");
    expect(announcement.textContent).toContain("The new settings are active.");

    await user.keyboard("{F6}");
    expect(document.activeElement?.closest('[role="region"]')).toBeTruthy();
  });
});
