import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { Button } from "./button";
import { Checkbox, Radio, RadioGroup, Switch } from "./choice-controls";
import { FormField } from "./form-field";
import { Input } from "./input";
import { Link } from "./link";
import { Select } from "./select";
import { Textarea } from "./textarea";

function FormShowcase({ extreme = false }: { extreme?: boolean }) {
  const longText =
    "A deliberately long description explains how this value appears to every Membership in the Active Organization without clipping controls or hiding the recovery action.";

  return (
    <form className="mx-auto grid max-w-3xl gap-8 p-5 sm:p-8" onSubmit={(event) => event.preventDefault()}>
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-accent-strong">
          Form foundation
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">
          Organization settings
        </h1>
        <p className="mt-2 max-w-2xl leading-7 text-muted">
          Normal, focused, disabled, invalid and loading states share one semantic system.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <FormField
          description={extreme ? longText : "Visible to every Membership."}
          label={extreme ? `Organization name — ${longText}` : "Organization name"}
          required
        >
          <Input defaultValue="Northstar Organization" required />
        </FormField>
        <FormField
          error="Use at least three characters; the current value is too short."
          label="Invalid name"
        >
          <Input aria-invalid defaultValue="N" />
        </FormField>
        <FormField label="Disabled field">
          <Input defaultValue="Managed by Clerk" disabled />
        </FormField>
        <FormField label="Organization locale">
          <Select
            label="Organization locale"
            options={[
              { label: "English", value: "en" },
              { label: "Português", value: "pt-BR" },
            ]}
            placeholder="Choose a locale"
          />
        </FormField>
      </div>

      <FormField
        description={extreme ? longText : "Give Members enough context to recognize it."}
        label="Description"
      >
        <Textarea defaultValue={extreme ? longText.repeat(3) : "A focused home for modern B2B organizations."} />
      </FormField>

      <div className="grid gap-6 rounded-panel border border-border bg-surface p-5 sm:grid-cols-2">
        <Checkbox label="Send security alerts" defaultChecked />
        <Switch label="Require multi-factor authentication" />
        <RadioGroup
          className="sm:col-span-2"
          defaultValue="admin"
          label="Default Membership Role"
          options={[
            { label: "Admin", value: "admin" },
            { label: "Member", value: "member" },
            { disabled: true, label: "Owner — assigned explicitly", value: "owner" },
          ]}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit">Save changes</Button>
        <Button variant="secondary">Secondary</Button>
        <Button disabled>Disabled</Button>
        <Button loading loadingLabel="Saving changes">
          Save changes
        </Button>
        <Link href="#form-link" variant="ghost">
          Learn more
        </Link>
        <Link disabled href="#disabled-link" variant="ghost">
          Unavailable link
        </Link>
      </div>
    </form>
  );
}

function ControlStateMatrix() {
  return (
    <div className="mx-auto grid max-w-3xl gap-8 p-5 sm:p-8">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-accent-strong">
          State matrix
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">
          Disabled and invalid controls
        </h1>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <FormField label="Unavailable locale">
          <Select
            disabled
            label="Unavailable locale"
            options={[{ label: "English", value: "en" }]}
          />
        </FormField>
        <FormField error="Choose a supported locale." label="Invalid locale">
          <Select
            invalid
            label="Invalid locale"
            options={[{ label: "English", value: "en" }]}
          />
        </FormField>
        <FormField label="Unavailable description">
          <Textarea defaultValue="Managed by policy" disabled />
        </FormField>
        <FormField error="Describe the Organization." label="Invalid description">
          <Textarea aria-invalid defaultValue="N" />
        </FormField>
      </div>
      <div className="grid gap-5 rounded-panel border border-border bg-surface p-5 sm:grid-cols-2">
        <Checkbox disabled label="Unavailable alerts" />
        <Checkbox aria-invalid label="Invalid alert choice" />
        <Switch disabled label="Unavailable authentication" />
        <Switch aria-invalid label="Invalid authentication choice" />
        <RadioGroup aria-invalid className="sm:col-span-2" label="Invalid Membership Role">
          <Radio aria-invalid label="Member" value="member" />
        </RadioGroup>
      </div>
    </div>
  );
}

function FocusSequence() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-start gap-5 p-8">
      <Button>Begin</Button>
      <Checkbox label="Alerts" />
      <RadioGroup label="Membership Role" options={[{ label: "Member", value: "member" }]} />
      <Switch label="Authentication" />
      <Select label="Locale" options={[{ label: "English", value: "en" }]} />
      <Textarea aria-label="Description" />
      <Link href="#focus-end">Finish</Link>
    </div>
  );
}

const meta = {
  component: FormShowcase,
  parameters: {
    docs: {
      description: {
        component:
          "Form controls use typed CVA variants and Base UI behavior behind the @saas/ui facade.",
      },
    },
  },
  title: "Foundations/Forms and controls",
} satisfies Meta<typeof FormShowcase>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ControlStates: Story = {};

export const AllControlStates: Story = {
  render: () => <ControlStateMatrix />,
};

export const FocusedInput: Story = {
  render: () => (
    <div className="mx-auto max-w-lg p-8">
      <FormField description="Focus remains visible in every theme." label="Focused input">
        <Input autoFocus defaultValue="Keyboard focus" />
      </FormField>
    </div>
  ),
};

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

export const ReducedMotionLoading: Story = {
  globals: { motion: "reduced" },
  render: () => (
    <div className="p-8">
      <Button loading loadingLabel="Saving Organization">
        Save Organization
      </Button>
    </div>
  ),
  play: async ({ canvas }) => {
    const indicator = canvas
      .getByRole("button", { name: "Saving Organization" })
      .querySelector<HTMLElement>('[data-slot="loading-indicator"]');

    await expect(indicator).not.toBeNull();
    await expect(getComputedStyle(indicator!).animationIterationCount).toBe("1");
  },
};

export const KeyboardInteraction: Story = {
  play: async ({ canvas, userEvent }) => {
    const checkbox = canvas.getByRole("checkbox", {
      name: "Send security alerts",
    });
    await userEvent.click(checkbox);
    await expect(checkbox).not.toBeChecked();

    const toggle = canvas.getByRole("switch", {
      name: "Require multi-factor authentication",
    });
    toggle.focus();
    await userEvent.keyboard(" ");
    await expect(toggle).toBeChecked();
  },
};

export const KeyboardFocusSequence: Story = {
  render: () => <FocusSequence />,
  play: async ({ canvas, userEvent }) => {
    for (const control of [
      canvas.getByRole("button", { name: "Begin" }),
      canvas.getByRole("checkbox", { name: "Alerts" }),
      canvas.getByRole("radio", { name: "Member" }),
      canvas.getByRole("switch", { name: "Authentication" }),
      canvas.getByRole("combobox", { name: "Locale" }),
      canvas.getByRole("textbox", { name: "Description" }),
      canvas.getByRole("link", { name: "Finish" }),
    ]) {
      await userEvent.tab();
      await expect(control).toHaveFocus();
    }
  },
};
