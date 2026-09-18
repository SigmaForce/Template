import { cleanup, render } from "@testing-library/react";
import { page } from "vitest/browser";
import { afterEach, expect, test } from "vitest";
import {
  Button,
  Checkbox,
  Dialog,
  FormField,
  Input,
  RadioGroup,
  Select,
  Switch,
  Textarea,
  ToastProvider,
  useToast,
} from "../src";
import "../src/styles.css";

afterEach(() => {
  cleanup();
  delete document.documentElement.dataset.theme;
});

function FeedbackFixture() {
  const toast = useToast();

  return (
    <Button
      onClick={() =>
        toast.add({
          description: "Members can now use the new policy.",
          priority: "high",
          title: "Organization policy saved",
          type: "success",
        })
      }
    >
      Save policy
    </Button>
  );
}

test("form pattern remains visually stable in the light theme", async () => {
  document.documentElement.dataset.theme = "light";

  render(
    <main
      className="grid w-[44rem] gap-5 bg-canvas p-8 text-foreground"
      data-testid="form-pattern"
    >
      <FormField
        description="Visible to every Membership."
        label="Organization name"
        required
      >
        <Input defaultValue="Northstar Organization" required />
      </FormField>
      <FormField
        error="Use at least three characters."
        label="Invalid description"
      >
        <Textarea aria-invalid defaultValue="N" />
      </FormField>
      <Select
        label="Organization locale"
        options={[{ label: "English", value: "en" }]}
        placeholder="Choose a locale"
      />
      <div className="grid gap-4 rounded-panel border border-border bg-surface p-5 sm:grid-cols-2">
        <Checkbox defaultChecked label="Security alerts" />
        <Switch label="Multi-factor authentication" />
        <RadioGroup
          className="sm:col-span-2"
          defaultValue="member"
          label="Membership Role"
          options={[
            { label: "Admin", value: "admin" },
            { label: "Member", value: "member" },
          ]}
        />
      </div>
    </main>,
  );

  await expect(page.getByTestId("form-pattern")).toMatchScreenshot(
    "form-pattern-light",
  );
});

test("overlay pattern remains visually stable in the dark theme", async () => {
  document.documentElement.dataset.theme = "dark";

  render(
    <div className="min-h-screen bg-canvas p-8 text-foreground">
      <Dialog
        defaultOpen
        description="Changes apply to the Active Organization."
        footer={<Button>Save</Button>}
        title="Edit Organization"
        trigger={<Button variant="secondary">Open dialog</Button>}
      >
        <FormField label="Organization name">
          <Input defaultValue="Northstar Organization" />
        </FormField>
      </Dialog>
    </div>,
  );

  await expect(
    page.getByRole("dialog", { name: "Edit Organization" }),
  ).toMatchScreenshot("dialog-pattern-dark");
});

test("urgent feedback remains visually stable in the dark theme", async () => {
  document.documentElement.dataset.theme = "dark";

  render(
    <div className="min-h-screen bg-canvas p-8 text-foreground">
      <ToastProvider timeout={0}>
        <FeedbackFixture />
      </ToastProvider>
    </div>,
  );

  await page.getByRole("button", { name: "Save policy" }).click();
  const toast = document.querySelector<HTMLElement>('[data-slot="toast"]');

  if (!toast) {
    throw new Error("The visible toast root was not rendered.");
  }

  await expect(page.elementLocator(toast)).toMatchScreenshot(
    "toast-pattern-dark",
  );
});
