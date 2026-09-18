"use client";

import { type VariantProps } from "class-variance-authority";
import { forwardRef, type ComponentProps } from "react";
import { buttonVariants } from "./button";
import { cn } from "./utils";

export interface LinkProps
  extends
    Omit<ComponentProps<"a">, "className">,
    VariantProps<typeof buttonVariants> {
  className?: string;
  disabled?: boolean;
}

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  {
    className,
    disabled = false,
    onClick,
    size,
    tabIndex,
    variant,
    ...properties
  },
  reference,
) {
  return (
    <a
      {...properties}
      aria-disabled={disabled || undefined}
      className={cn(buttonVariants({ size, variant }), className)}
      onClick={(event) => {
        if (disabled) {
          event.preventDefault();
          return;
        }

        onClick?.(event);
      }}
      ref={reference}
      tabIndex={disabled ? -1 : tabIndex}
    />
  );
});
