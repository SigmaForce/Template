import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  EmptyState,
  ErrorState,
  ForbiddenState,
  LoadingState,
  ReadOnlyState,
} from "../src";

afterEach(cleanup);

describe("product states", () => {
  it("announces an indeterminate loading operation by name", () => {
    render(
      <LoadingState
        description="Retrieving Memberships for the Active Organization."
        label="Loading Memberships"
      />,
    );

    const progress = screen.getByRole("progressbar", { name: "Loading Memberships" });
    expect(progress.getAttribute("aria-valuenow")).toBeNull();
    expect(screen.getByText("Retrieving Memberships for the Active Organization.")).toBeTruthy();
  });

  it("keeps empty, forbidden and Read-only Organization actions discoverable", () => {
    render(
      <div>
        <EmptyState
          action={<button type="button">Invite User</button>}
          description="No Memberships match these filters."
          title="No Memberships found"
        />
        <ForbiddenState
          action={<a href="/organizations">Choose another Organization</a>}
          description="Your Membership does not have Permission to view billing."
        />
        <ReadOnlyState
          action={<a href="/billing">Resolve billing</a>}
          description="Existing data remains available, but changes are disabled."
        />
      </div>,
    );

    const empty = screen.getByRole("region", { name: "No Memberships found" });
    expect(within(empty).getByRole("button", { name: "Invite User" })).toBeTruthy();

    const forbidden = screen.getByRole("region", { name: "Access unavailable" });
    expect(within(forbidden).getByRole("link", { name: "Choose another Organization" })).toBeTruthy();

    const readOnly = screen.getByRole("status", { name: "Read-only Organization" });
    expect(within(readOnly).getByRole("link", { name: "Resolve billing" })).toBeTruthy();
  });

  it("announces a failed operation and exposes its recovery action", () => {
    render(
      <ErrorState
        action={<button type="button">Try again</button>}
        description="Memberships could not be loaded."
        title="Unable to load Memberships"
      />,
    );

    const error = screen.getByRole("alert", { name: "Unable to load Memberships" });
    expect(within(error).getByText("Memberships could not be loaded.")).toBeTruthy();
    expect(within(error).getByRole("button", { name: "Try again" })).toBeTruthy();
  });
});
