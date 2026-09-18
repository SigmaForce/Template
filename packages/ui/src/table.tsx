"use client";

import { forwardRef, type ComponentProps } from "react";
import { cn } from "./utils";

export interface TableProps extends ComponentProps<"table"> {
  containerClassName?: string;
}

export const Table = forwardRef<HTMLTableElement, TableProps>(function Table(
  { className, containerClassName, ...properties },
  reference,
) {
  return (
    <div
      className={cn(
        "max-w-full overflow-x-auto rounded-panel border border-border bg-surface",
        containerClassName,
      )}
    >
      <table
        {...properties}
        className={cn(
          "w-full min-w-max border-collapse text-sm text-foreground",
          className,
        )}
        ref={reference}
      />
    </div>
  );
});

export const TableHeader = forwardRef<
  HTMLTableSectionElement,
  ComponentProps<"thead">
>(function TableHeader({ className, ...properties }, reference) {
  return (
    <thead
      {...properties}
      className={cn("bg-surface-strong text-left", className)}
      ref={reference}
    />
  );
});

export const TableBody = forwardRef<
  HTMLTableSectionElement,
  ComponentProps<"tbody">
>(function TableBody({ className, ...properties }, reference) {
  return (
    <tbody
      {...properties}
      className={cn("divide-y divide-border", className)}
      ref={reference}
    />
  );
});

export const TableRow = forwardRef<HTMLTableRowElement, ComponentProps<"tr">>(
  function TableRow({ className, ...properties }, reference) {
    return (
      <tr
        {...properties}
        className={cn(
          "transition-colors hover:bg-surface-strong/60",
          className,
        )}
        ref={reference}
      />
    );
  },
);

export const TableHead = forwardRef<HTMLTableCellElement, ComponentProps<"th">>(
  function TableHead({ className, scope = "col", ...properties }, reference) {
    return (
      <th
        {...properties}
        className={cn(
          "h-11 px-4 text-xs font-black uppercase tracking-wide text-muted",
          className,
        )}
        ref={reference}
        scope={scope}
      />
    );
  },
);

export const TableCell = forwardRef<HTMLTableCellElement, ComponentProps<"td">>(
  function TableCell({ className, ...properties }, reference) {
    return (
      <td
        {...properties}
        className={cn("px-4 py-3 align-middle", className)}
        ref={reference}
      />
    );
  },
);

export const TableCaption = forwardRef<
  HTMLTableCaptionElement,
  ComponentProps<"caption">
>(function TableCaption({ className, ...properties }, reference) {
  return (
    <caption
      {...properties}
      className={cn("sr-only", className)}
      ref={reference}
    />
  );
});
