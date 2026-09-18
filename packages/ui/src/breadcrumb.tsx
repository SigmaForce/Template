"use client";

import type { ComponentProps, ReactNode } from "react";
import { cn } from "./utils";

export interface BreadcrumbItem {
  href?: string;
  label: ReactNode;
}

export interface BreadcrumbProps extends Omit<
  ComponentProps<"nav">,
  "children"
> {
  items: BreadcrumbItem[];
  label?: string;
}

export function Breadcrumb({
  className,
  items,
  label = "Breadcrumb",
  ...properties
}: BreadcrumbProps) {
  return (
    <nav {...properties} aria-label={label} className={className}>
      <ol className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-muted">
        {items.map((item, index) => {
          const current = index === items.length - 1;

          return (
            <li
              className="flex min-w-0 items-center gap-2"
              key={`${index}-${String(item.href)}`}
            >
              {index > 0 ? (
                <span className="text-subtle" aria-hidden="true">
                  /
                </span>
              ) : null}
              {item.href && !current ? (
                <a
                  className="rounded-choice font-semibold outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
                  href={item.href}
                >
                  {item.label}
                </a>
              ) : (
                <span
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "truncate",
                    current && "font-bold text-foreground",
                  )}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
