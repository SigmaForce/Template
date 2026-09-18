import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import {
  Button,
  Checkbox,
  FormField,
  Link,
  Radio,
  RadioGroup,
  Select,
  Switch,
  Textarea,
} from "../src";

afterEach(cleanup);

describe("form controls", () => {
  it("makes a loading button unavailable and announces the pending action", () => {
    render(
      <Button loading loadingLabel="Saving Organization">
        Save
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Saving Organization" });

    expect(button.getAttribute("aria-busy")).toBe("true");
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  it("lets keyboard users operate choice controls", async () => {
    const user = userEvent.setup();

    render(
      <div>
        <Checkbox label="Send security alerts" />
        <RadioGroup
          label="Membership Role"
          options={[
            { label: "Admin", value: "admin" },
            { label: "Member", value: "member" },
          ]}
        />
        <Switch label="Require multi-factor authentication" />
        <Select
          label="Organization locale"
          options={[
            { label: "English", value: "en" },
            { label: "Português", value: "pt-BR" },
          ]}
          placeholder="Choose a locale"
        />
      </div>,
    );

    const checkbox = screen.getByRole("checkbox", {
      name: "Send security alerts",
    });
    checkbox.focus();
    await user.keyboard(" ");
    expect(checkbox.getAttribute("aria-checked")).toBe("true");

    const admin = screen.getByRole("radio", { name: "Admin" });
    admin.focus();
    await user.keyboard("{ArrowDown}");
    expect(
      screen
        .getByRole("radio", { name: "Member" })
        .getAttribute("aria-checked"),
    ).toBe("true");

    const toggle = screen.getByRole("switch", {
      name: "Require multi-factor authentication",
    });
    toggle.focus();
    await user.keyboard(" ");
    expect(toggle.getAttribute("aria-checked")).toBe("true");

    const select = screen.getByRole("combobox", {
      name: "Organization locale",
    });
    select.focus();
    await user.keyboard("{Enter}");
    await screen.findByRole("option", { name: "English" });
    await user.keyboard("{ArrowDown}{Enter}");
    expect(select.textContent).toContain("Português");
  });

  it("exposes invalid multiline input and unavailable link states without color alone", () => {
    render(
      <div>
        <FormField error="Explain why this change is needed." label="Reason">
          <Textarea />
        </FormField>
        <Link disabled href="/billing">
          Open billing
        </Link>
      </div>,
    );

    expect(
      screen
        .getByRole("textbox", { name: "Reason" })
        .getAttribute("aria-invalid"),
    ).toBe("true");

    const link = screen.getByRole("link", { name: "Open billing" });
    expect(link.getAttribute("aria-disabled")).toBe("true");
    expect(link.getAttribute("tabindex")).toBe("-1");
  });

  it("supports composable Radio items without exposing the primitive layer", async () => {
    const user = userEvent.setup();

    render(
      <RadioGroup label="Invitation Role">
        <Radio label="Admin" value="admin" />
        <Radio label="Member" value="member" />
      </RadioGroup>,
    );

    const member = screen.getByRole("radio", { name: "Member" });
    await user.click(member);
    expect(member.getAttribute("aria-checked")).toBe("true");
  });

  it("exposes disabled and invalid states across compound controls", () => {
    render(
      <div>
        <Checkbox aria-invalid disabled label="Disabled alerts" />
        <RadioGroup label="Invalid role">
          <Radio aria-invalid label="Member" value="member" />
        </RadioGroup>
        <Switch aria-invalid disabled label="Disabled authentication" />
        <Select
          disabled
          invalid
          label="Disabled locale"
          options={[{ label: "English", value: "en" }]}
        />
        <Textarea aria-invalid aria-label="Invalid description" disabled />
      </div>,
    );

    expect(
      screen
        .getByRole("checkbox", { name: "Disabled alerts" })
        .getAttribute("aria-disabled"),
    ).toBe("true");
    expect(
      screen
        .getByRole("radio", { name: "Member" })
        .getAttribute("aria-invalid"),
    ).toBe("true");
    expect(
      screen
        .getByRole("switch", { name: "Disabled authentication" })
        .getAttribute("aria-disabled"),
    ).toBe("true");
    expect(
      screen
        .getByRole("combobox", { name: "Disabled locale" })
        .getAttribute("aria-invalid"),
    ).toBe("true");
    expect(
      (
        screen.getByRole("textbox", {
          name: "Invalid description",
        }) as HTMLTextAreaElement
      ).disabled,
    ).toBe(true);
  });
});
