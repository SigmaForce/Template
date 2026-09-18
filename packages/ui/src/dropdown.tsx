"use client";

import { Menu } from "@base-ui/react/menu";
import { cva, type VariantProps } from "class-variance-authority";
import type { ReactElement } from "react";
import { cn } from "./utils";

const dropdownItemVariants = cva(
  "flex min-h-10 cursor-default items-center rounded-control px-3 text-sm font-semibold outline-none data-[disabled]:opacity-45 data-[highlighted]:bg-accent-soft data-[highlighted]:text-accent-strong",
  {
    variants: {
      tone: {
        default: "text-foreground",
        danger:
          "text-negative data-[highlighted]:bg-negative/10 data-[highlighted]:text-negative",
      },
    },
    defaultVariants: { tone: "default" },
  },
);

export interface DropdownItem extends VariantProps<
  typeof dropdownItemVariants
> {
  disabled?: boolean;
  href?: string;
  label: string;
  onSelect?: () => void;
}

export interface DropdownProps extends Omit<Menu.Root.Props, "children"> {
  items: DropdownItem[];
  label?: string;
  trigger: ReactElement;
}

export function Dropdown({
  items,
  label = "Actions",
  trigger,
  ...properties
}: DropdownProps) {
  return (
    <Menu.Root {...properties}>
      <Menu.Trigger render={trigger} />
      <Menu.Portal>
        <Menu.Positioner align="start" className="z-50" sideOffset={6}>
          <Menu.Popup
            aria-label={label}
            className="min-w-48 origin-[var(--transform-origin)] rounded-control border border-border bg-surface p-1 text-foreground shadow-panel outline-none transition-[transform,opacity] data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 motion-reduce:transition-none"
          >
            {items.map((item) =>
              item.href && !item.disabled ? (
                <Menu.LinkItem
                  className={dropdownItemVariants({ tone: item.tone })}
                  href={item.href}
                  key={`${item.href}-${item.label}`}
                  onClick={item.onSelect}
                >
                  {item.label}
                </Menu.LinkItem>
              ) : (
                <Menu.Item
                  className={cn(dropdownItemVariants({ tone: item.tone }))}
                  disabled={item.disabled}
                  key={item.label}
                  onClick={item.onSelect}
                >
                  {item.label}
                </Menu.Item>
              ),
            )}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

export { dropdownItemVariants };
