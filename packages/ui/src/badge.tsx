"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ComponentProps } from "react";
import { cn } from "./utils";

export const badgeVariants = cva(
  "inline-flex min-h-6 items-center rounded-full border px-2.5 py-0.5 text-xs font-bold",
  {
    variants: {
      tone: {
        accent: "border-accent/30 bg-accent-soft text-accent-strong",
        negative: "border-negative/30 bg-negative/10 text-foreground",
        neutral: "border-border bg-surface-strong text-muted",
        positive: "border-positive/30 bg-positive/10 text-positive",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface BadgeProps
  extends Omit<ComponentProps<"span">, "className">,
    VariantProps<typeof badgeVariants> {
  className?: string;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { className, tone, ...properties },
  reference,
) {
  return (
    <span
      {...properties}
      className={cn(badgeVariants({ tone }), className)}
      ref={reference}
    />
  );
});
