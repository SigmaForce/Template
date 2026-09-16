"use client";

import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import { cva } from "class-variance-authority";
import type { ReactNode } from "react";
import { cn } from "./utils";

export const tabVariants = cva(
  "relative z-10 min-h-10 shrink-0 rounded-control px-3 text-sm font-bold text-muted outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus data-[active]:text-foreground disabled:cursor-not-allowed disabled:opacity-50",
);

export interface TabItem {
  content: ReactNode;
  disabled?: boolean;
  label: ReactNode;
  value: string;
}

export interface TabsProps extends Omit<BaseTabs.Root.Props, "children"> {
  items: TabItem[];
}

export function Tabs({ className, items, ...properties }: TabsProps) {
  return (
    <BaseTabs.Root {...properties} className={cn("min-w-0", className)}>
      <BaseTabs.List
        activateOnFocus
        className="relative flex max-w-full gap-1 overflow-x-auto rounded-control border border-border bg-surface-strong p-1"
      >
        {items.map((item) => (
          <BaseTabs.Tab
            className={tabVariants()}
            disabled={item.disabled}
            key={item.value}
            value={item.value}
          >
            {item.label}
          </BaseTabs.Tab>
        ))}
        <BaseTabs.Indicator className="absolute inset-y-1 left-0 rounded-control bg-surface shadow-sm transition-[transform,width] motion-reduce:transition-none" />
      </BaseTabs.List>
      {items.map((item) => (
        <BaseTabs.Panel
          className="py-5 text-sm leading-6 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-focus"
          key={item.value}
          value={item.value}
        >
          {item.content}
        </BaseTabs.Panel>
      ))}
    </BaseTabs.Root>
  );
}
