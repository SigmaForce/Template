"use client";

import { Button as BaseButton } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ComponentProps } from "react";
import { cn } from "./utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-control font-bold outline-none transition-[background-color,border-color,color,box-shadow,transform] focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-55 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-negative",
  {
    variants: {
      size: {
        sm: "min-h-9 px-3 text-sm",
        md: "min-h-11 px-4 text-sm",
        lg: "min-h-12 px-5 text-base",
        icon: "size-11 shrink-0",
      },
      variant: {
        primary:
          "bg-accent text-accent-contrast shadow-sm hover:bg-accent-strong active:translate-y-px",
        secondary:
          "border border-border bg-surface text-foreground shadow-sm hover:bg-surface-strong",
        ghost: "text-foreground hover:bg-surface-strong",
        danger:
          "bg-negative text-negative-contrast shadow-sm hover:brightness-90",
      },
    },
    defaultVariants: { size: "md", variant: "primary" },
  },
);

export interface ButtonProps
  extends
    Omit<ComponentProps<typeof BaseButton>, "className">,
    VariantProps<typeof buttonVariants> {
  className?: string;
  loading?: boolean;
  loadingLabel?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      children,
      className,
      disabled,
      loading = false,
      loadingLabel = "Loading",
      size,
      variant,
      ...properties
    },
    reference,
  ) {
    return (
      <BaseButton
        {...properties}
        aria-busy={loading || undefined}
        className={cn(buttonVariants({ size, variant }), className)}
        disabled={disabled || loading}
        ref={reference}
      >
        {loading ? (
          <span
            className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"
            aria-hidden="true"
            data-slot="loading-indicator"
          />
        ) : null}
        <span aria-hidden={loading || undefined}>{children}</span>
        {loading ? <span className="sr-only">{loadingLabel}</span> : null}
      </BaseButton>
    );
  },
);
