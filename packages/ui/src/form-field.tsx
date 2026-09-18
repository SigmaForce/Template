"use client";

import { Field } from "@base-ui/react/field";
import type { ReactNode } from "react";
import { cn } from "./utils";

export interface FormFieldProps extends Omit<Field.Root.Props, "children"> {
  children: ReactNode;
  className?: string;
  description?: ReactNode;
  error?: ReactNode;
  label: ReactNode;
  required?: boolean;
}

export function FormField({
  children,
  className,
  description,
  error,
  invalid,
  label,
  required,
  ...properties
}: FormFieldProps) {
  return (
    <Field.Root
      {...properties}
      className={cn("grid gap-2", className)}
      invalid={invalid || Boolean(error)}
    >
      <Field.Label className="text-sm font-bold text-foreground">
        {label}
        {required ? (
          <>
            <span className="ml-1 text-negative" aria-hidden="true">
              *
            </span>
            <span className="sr-only"> (required)</span>
          </>
        ) : null}
      </Field.Label>
      {children}
      {description ? (
        <Field.Description className="text-sm leading-5 text-muted">
          {description}
        </Field.Description>
      ) : null}
      {error ? (
        <Field.Error
          className="flex items-start gap-1.5 text-sm font-semibold leading-5 text-negative"
          match
          role="alert"
        >
          <span aria-hidden="true">!</span>
          <span>{error}</span>
        </Field.Error>
      ) : null}
    </Field.Root>
  );
}
