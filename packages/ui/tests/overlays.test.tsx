import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { Button, Dialog, Drawer, Input } from "../src";

afterEach(cleanup);

describe("overlays", () => {
  it.each([
    {
      Component: Dialog,
      contentName: "Edit Organization",
      triggerName: "Open dialog",
    },
    {
      Component: Drawer,
      contentName: "Organization filters",
      triggerName: "Open drawer",
    },
  ])(
    "moves focus into and returns focus from $contentName",
    async ({ Component, contentName, triggerName }) => {
      const user = userEvent.setup();

      render(
        <Component
          description="Changes are applied to the Active Organization."
          title={contentName}
          trigger={<Button variant="secondary">{triggerName}</Button>}
        >
          <Input aria-label="Organization value" />
        </Component>,
      );

      const trigger = screen.getByRole("button", { name: triggerName });
      await user.click(trigger);

      const overlay = screen.getByRole("dialog", { name: contentName });
      expect(overlay.contains(document.activeElement)).toBe(true);
      expect(
        within(overlay).getByText(
          "Changes are applied to the Active Organization.",
        ),
      ).toBeTruthy();

      await user.keyboard("{Escape}");
      expect(screen.queryByRole("dialog", { name: contentName })).toBeNull();
      expect(document.activeElement).toBe(trigger);
    },
  );
});
