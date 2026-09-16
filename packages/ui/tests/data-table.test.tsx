import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { DataTable, Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "../src";

afterEach(cleanup);

interface OrganizationRow {
  id: string;
  name: string;
  status: string;
}

describe("tables and opaque cursor pagination", () => {
  it("keeps a composable table semantic", () => {
    render(
      <Table>
        <TableCaption>Organization summary</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Organization</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Northstar</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    const table = screen.getByRole("table", { name: "Organization summary" });
    expect(within(table).getByRole("columnheader", { name: "Organization" })).toBeTruthy();
    expect(within(table).getByRole("cell", { name: "Northstar" })).toBeTruthy();
  });

  it("renders headers and keyboard reachable row actions", async () => {
    const user = userEvent.setup();
    const rows: OrganizationRow[] = [
      { id: "org_1", name: "Northstar", status: "Active" },
      { id: "org_2", name: "Atlas", status: "Read-only" },
    ];

    render(
      <DataTable
        actions={(row) => <button type="button">Manage {row.name}</button>}
        caption="Organizations"
        columns={[
          { cell: (row) => row.name, header: "Organization", key: "name" },
          { cell: (row) => row.status, header: "Status", key: "status" },
        ]}
        getRowKey={(row) => row.id}
        rows={rows}
      />,
    );

    const table = screen.getByRole("table", { name: "Organizations" });
    expect(within(table).getAllByRole("columnheader")).toHaveLength(3);

    await user.tab();
    expect(screen.getByRole("button", { name: "Manage Northstar" })).toBe(document.activeElement);
    await user.tab();
    expect(screen.getByRole("button", { name: "Manage Atlas" })).toBe(document.activeElement);
  });

  it("forwards opaque previous and next cursors without displaying totals", async () => {
    const user = userEvent.setup();
    const navigations: Array<{ cursor: string; direction: string }> = [];

    render(
      <DataTable<OrganizationRow>
        caption="Organizations"
        columns={[{ cell: (row) => row.name, header: "Organization", key: "name" }]}
        getRowKey={(row) => row.id}
        pagination={{
          nextCursor: "eyJpZCI6Im9yZ18yIn0",
          onNavigate: (cursor, direction) => navigations.push({ cursor, direction }),
          previousCursor: "eyJpZCI6Im9yZ18wIn0",
        }}
        rows={[{ id: "org_1", name: "Northstar", status: "Active" }]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Previous results" }));
    await user.click(screen.getByRole("button", { name: "Next results" }));

    expect(navigations).toEqual([
      { cursor: "eyJpZCI6Im9yZ18wIn0", direction: "previous" },
      { cursor: "eyJpZCI6Im9yZ18yIn0", direction: "next" },
    ]);
    expect(screen.queryByText(/page \d|of \d/i)).toBeNull();
  });
});
