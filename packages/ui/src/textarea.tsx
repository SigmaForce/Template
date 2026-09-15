"use client";

import { Field } from "@base-ui/react/field";
import { type VariantProps } from "class-variance-authority";
import { forwardRef, type ComponentProps } from "react";
import { inputVariants } from "./input";
import { cn } from "./utils";

export interface TextareaProps
  extends Omit<ComponentProps<"textarea">, "className">,
    VariantProps<typeof inputVariants> {
  className?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, size, ...properties }, reference) {
    return (
      <Field.Control
        render={
          <textarea
            {...properties}
            className={cn(
              inputVariants({ size }),
              "min-h-28 resize-y py-3",
              className,
            )}
            ref={reference}
          />
        }
      />
    );
  },
);
