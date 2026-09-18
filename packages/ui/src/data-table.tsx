"use client";

import { cva, type VariantProps } from "class-variance-authority";
import type { Key, ReactNode } from "react";
import { Button } from "./button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";

export type CursorDirection = "previous" | "next";

export interface CursorPaginationProps {
  label?: string;
  nextCursor?: string | null;
  onNavigate: (cursor: string, direction: CursorDirection) => void;
  previousCursor?: string | null;
}

export function CursorPagination({
  label = "Table pagination",
  nextCursor,
  onNavigate,
  previousCursor,
}: CursorPaginationProps) {
  return (
    <nav
      aria-label={label}
      className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface px-4 py-3"
    >
      <p className="text-sm text-muted">Navigate through available results.</p>
      <div className="flex gap-2">
        <Button
          disabled={!previousCursor}
          onClick={() =>
            previousCursor && onNavigate(previousCursor, "previous")
          }
          size="sm"
          variant="secondary"
        >
          <span aria-hidden="true">←</span>
          Previous results
        </Button>
        <Button
          disabled={!nextCursor}
          onClick={() => nextCursor && onNavigate(nextCursor, "next")}
          size="sm"
          variant="secondary"
        >
          Next results
          <span aria-hidden="true">→</span>
        </Button>
      </div>
    </nav>
  );
}

export const dataTableCellVariants = cva("", {
  variants: {
    align: {
      center: "text-center",
      end: "text-right",
      start: "text-left",
    },
  },
  defaultVariants: { align: "start" },
});

export interface DataTableColumn<Row> {
  align?: VariantProps<typeof dataTableCellVariants>["align"];
  cell: (row: Row) => ReactNode;
  header: ReactNode;
  key: string;
}

export interface DataTableProps<Row> {
  actions?: (row: Row) => ReactNode;
  actionsLabel?: string;
  caption: ReactNode;
  columns: Array<DataTableColumn<Row>>;
  emptyContent?: ReactNode;
  getRowKey: (row: Row) => Key;
  pagination?: CursorPaginationProps;
  rows: Row[];
}

export function DataTable<Row>({
  actions,
  actionsLabel = "Actions",
  caption,
  columns,
  emptyContent = "No results are available.",
  getRowKey,
  pagination,
  rows,
}: DataTableProps<Row>) {
  const columnCount = columns.length + (actions ? 1 : 0);

  return (
    <div className="overflow-hidden rounded-panel border border-border bg-surface">
      <Table
        className="border-0"
        containerClassName="rounded-none border-0"
        data-slot="data-table"
      >
        <TableCaption>{caption}</TableCaption>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead
                className={dataTableCellVariants({ align: column.align })}
                key={column.key}
              >
                {column.header}
              </TableHead>
            ))}
            {actions ? (
              <TableHead className="text-right">{actionsLabel}</TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                className="py-10 text-center text-muted"
                colSpan={columnCount}
              >
                {emptyContent}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={getRowKey(row)}>
                {columns.map((column) => (
                  <TableCell
                    className={dataTableCellVariants({ align: column.align })}
                    key={column.key}
                  >
                    {column.cell(row)}
                  </TableCell>
                ))}
                {actions ? (
                  <TableCell className="text-right">{actions(row)}</TableCell>
                ) : null}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {pagination ? <CursorPagination {...pagination} /> : null}
    </div>
  );
}
