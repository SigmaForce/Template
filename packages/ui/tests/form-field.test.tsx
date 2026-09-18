import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FormField, Input } from "../src";

afterEach(cleanup);

describe("FormField", () => {
  it("associates its label, description, invalid state and error with the control", () => {
    render(
      <FormField
        description="Shown to other Organization Members."
        error="Enter an Organization name."
        label="Organization name"
        required
      >
        <Input name="organizationName" required />
      </FormField>,
    );

    const input = screen.getByRole("textbox", { name: /Organization name/ });
    const description = screen.getByText(
      "Shown to other Organization Members.",
    );
    const error = screen.getByRole("alert");
    const describedBy =
      input.getAttribute("aria-describedby")?.split(" ") ?? [];

    expect(error.textContent).toContain("Enter an Organization name.");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect((input as HTMLInputElement).required).toBe(true);
    expect(describedBy).toContain(description.id);
    expect(describedBy).toContain(error.id);
  });
});
