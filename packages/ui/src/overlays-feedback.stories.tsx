import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, waitFor, within } from "storybook/test";
import { Button } from "./button";
import { Dropdown } from "./dropdown";
import { Input } from "./input";
import { Dialog, Drawer } from "./overlays";
import { ToastProvider, useToast } from "./toast";
import { Tooltip } from "./tooltip";

function ToastDemo() {
  const toast = useToast();

  return (
    <Button
      onClick={() =>
        toast.add({
          description: "The new settings are active.",
          priority: "high",
          title: "Organization saved",
          type: "success",
        })
      }
      variant="secondary"
    >
      Show toast
    </Button>
  );
}

function InteractionShowcase({ extreme = false }: { extreme?: boolean }) {
  const description = extreme
    ? "This explanation intentionally contains enough detail to wrap across several lines while preserving controls, focus order, dismiss actions and readable spacing at narrow widths and enlarged text."
    : "Changes apply to the Active Organization.";

  return (
    <ToastProvider>
      <div className="mx-auto grid max-w-4xl gap-7 p-5 sm:p-8">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-accent-strong">
            Overlay foundation
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">
            Focus-safe interactions
          </h1>
          <p className="mt-2 max-w-2xl leading-7 text-muted">{description}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Dialog
            description={description}
            title="Edit Organization"
            trigger={<Button>Open dialog</Button>}
          >
            <Input
              aria-label="Organization name"
              defaultValue="Northstar Organization"
            />
          </Dialog>
          <Drawer
            description={description}
            title="Organization filters"
            trigger={<Button variant="secondary">Open drawer</Button>}
          >
            <p className="leading-7 text-muted">
              {extreme ? description.repeat(5) : description}
            </p>
          </Drawer>
          <Dropdown
            items={[
              { label: "Rename" },
              { label: "Duplicate" },
              { label: "Delete", tone: "danger" },
            ]}
            label="Organization actions"
            trigger={<Button variant="secondary">Open menu</Button>}
          />
          <Tooltip
            accessibleLabel="Security policy — only Owners can change this setting"
            content="Only Owners can change this setting."
          >
            <Button variant="secondary">Security policy</Button>
          </Tooltip>
          <ToastDemo />
        </div>
      </div>
    </ToastProvider>
  );
}

const meta = {
  component: InteractionShowcase,
  title: "Foundations/Overlays and feedback",
} satisfies Meta<typeof InteractionShowcase>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {};

export const DarkTheme: Story = {
  globals: { theme: "dark" },
};

export const ExtremeContentAt200Percent: Story = {
  args: { extreme: true },
  globals: {
    textScale: "expanded",
    viewport: { isRotated: false, value: "mobile2" },
  },
};

export const DialogKeyboardFlow: Story = {
  play: async ({ canvas, canvasElement, userEvent }) => {
    const trigger = canvas.getByRole("button", { name: "Open dialog" });
    await userEvent.click(trigger);

    const page = within(canvasElement.ownerDocument.body);
    const dialog = await page.findByRole("dialog", {
      name: "Edit Organization",
    });
    await expect(
      dialog.contains(canvasElement.ownerDocument.activeElement),
    ).toBe(true);

    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(
        page.queryByRole("dialog", { name: "Edit Organization" }),
      ).toBeNull(),
    );
    await expect(trigger).toHaveFocus();
  },
};
