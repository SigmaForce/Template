"use client";

import { Input as BaseInput } from "@base-ui/react/input";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ComponentProps } from "react";
import { cn } from "./utils";

export const inputVariants = cva(
  "w-full rounded-control border border-border bg-surface text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-subtle hover:border-muted focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/25 disabled:cursor-not-allowed disabled:bg-surface-strong disabled:text-subtle disabled:opacity-70 aria-[invalid=true]:border-negative aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-negative/20",
  {
    variants: {
      size: {
        sm: "min-h-9 px-2.5 text-sm",
        md: "min-h-11 px-3 text-base",
        lg: "min-h-12 px-4 text-base",
      },
    },
    defaultVariants: { size: "md" },
  },
);

export interface InputProps
  extends
    Omit<ComponentProps<typeof BaseInput>, "className" | "size">,
    VariantProps<typeof inputVariants> {
  className?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, size, ...properties },
  reference,
) {
  return (
    <BaseInput
      {...properties}
      className={cn(inputVariants({ size }), className)}
      ref={reference}
    />
  );
});
