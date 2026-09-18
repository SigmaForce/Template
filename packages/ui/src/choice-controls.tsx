"use client";

import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { Radio as BaseRadio } from "@base-ui/react/radio";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import { Switch as BaseSwitch } from "@base-ui/react/switch";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "./utils";

const choiceIndicatorVariants = cva(
  "grid shrink-0 place-items-center border border-border bg-surface text-accent-contrast outline-none transition-[background-color,border-color,box-shadow] aria-[invalid=true]:border-negative data-[checked]:border-accent data-[checked]:bg-accent focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[invalid]:border-negative",
  {
    variants: {
      size: {
        sm: "size-4",
        md: "size-5",
      },
    },
    defaultVariants: { size: "md" },
  },
);

export interface CheckboxProps
  extends
    Omit<ComponentProps<typeof BaseCheckbox.Root>, "className">,
    VariantProps<typeof choiceIndicatorVariants> {
  className?: string;
  description?: ReactNode;
  label: ReactNode;
}

export const Checkbox = forwardRef<HTMLElement, CheckboxProps>(
  function Checkbox(
    { className, description, label, size, ...properties },
    reference,
  ) {
    const labelId = useId();
    const descriptionId = useId();

    return (
      <label
        className={cn(
          "flex items-start gap-3 text-sm text-foreground",
          className,
        )}
      >
        <BaseCheckbox.Root
          {...properties}
          aria-describedby={description ? descriptionId : undefined}
          aria-labelledby={labelId}
          className={cn(
            choiceIndicatorVariants({ size }),
            "mt-0.5 rounded-choice",
          )}
          ref={reference}
        >
          <BaseCheckbox.Indicator className="text-xs font-black">
            ✓
          </BaseCheckbox.Indicator>
        </BaseCheckbox.Root>
        <span className="grid gap-1">
          <span className="font-semibold" id={labelId}>
            {label}
          </span>
          {description ? (
            <span className="leading-5 text-muted" id={descriptionId}>
              {description}
            </span>
          ) : null}
        </span>
      </label>
    );
  },
);

export interface RadioOption {
  disabled?: boolean;
  label: ReactNode;
  value: string;
}

export interface RadioProps
  extends
    Omit<ComponentProps<typeof BaseRadio.Root<string>>, "className">,
    VariantProps<typeof choiceIndicatorVariants> {
  className?: string;
  label: ReactNode;
}

export const Radio = forwardRef<HTMLElement, RadioProps>(function Radio(
  { className, disabled, label, size, value, ...properties },
  reference,
) {
  const labelId = useId();

  return (
    <label
      className={cn(
        "flex items-center gap-3 text-sm text-foreground",
        className,
      )}
    >
      <BaseRadio.Root
        {...properties}
        aria-labelledby={labelId}
        className={cn(choiceIndicatorVariants({ size }), "rounded-full")}
        disabled={disabled}
        ref={reference}
        value={value}
      >
        <BaseRadio.Indicator className="size-2 rounded-full bg-current" />
      </BaseRadio.Root>
      <span className="font-semibold" id={labelId}>
        {label}
      </span>
    </label>
  );
});

export interface RadioGroupProps extends Omit<
  ComponentProps<typeof BaseRadioGroup>,
  "children"
> {
  children?: ReactNode;
  className?: string;
  label: ReactNode;
  options?: RadioOption[];
  size?: VariantProps<typeof choiceIndicatorVariants>["size"];
}

export function RadioGroup({
  children,
  className,
  label,
  options,
  size,
  ...properties
}: RadioGroupProps) {
  const labelId = useId();

  return (
    <fieldset className={cn("grid gap-3", className)}>
      <legend className="mb-1 text-sm font-bold text-foreground" id={labelId}>
        {label}
      </legend>
      <BaseRadioGroup
        {...properties}
        aria-labelledby={labelId}
        className="grid gap-2"
      >
        {children}
        {options?.map((option) => (
          <Radio
            disabled={option.disabled}
            key={option.value}
            label={option.label}
            size={size}
            value={option.value}
          />
        ))}
      </BaseRadioGroup>
    </fieldset>
  );
}

const switchVariants = cva(
  "relative shrink-0 rounded-full border border-border bg-surface-strong outline-none transition-colors aria-[invalid=true]:border-negative data-[checked]:border-accent data-[checked]:bg-accent focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[invalid]:border-negative",
  {
    variants: {
      size: {
        sm: "h-5 w-9",
        md: "h-6 w-11",
      },
    },
    defaultVariants: { size: "md" },
  },
);

export interface SwitchProps
  extends
    Omit<ComponentProps<typeof BaseSwitch.Root>, "className">,
    VariantProps<typeof switchVariants> {
  className?: string;
  description?: ReactNode;
  label: ReactNode;
}

export const Switch = forwardRef<HTMLElement, SwitchProps>(function Switch(
  { className, description, label, size, ...properties },
  reference,
) {
  const labelId = useId();
  const descriptionId = useId();

  return (
    <label
      className={cn(
        "flex items-start justify-between gap-4 text-sm",
        className,
      )}
    >
      <span className="grid gap-1">
        <span className="font-semibold text-foreground" id={labelId}>
          {label}
        </span>
        {description ? (
          <span className="leading-5 text-muted" id={descriptionId}>
            {description}
          </span>
        ) : null}
      </span>
      <BaseSwitch.Root
        {...properties}
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={labelId}
        className={switchVariants({ size })}
        ref={reference}
      >
        <BaseSwitch.Thumb className="block size-5 translate-x-0 rounded-full bg-surface shadow-sm transition-transform data-[checked]:translate-x-5 data-[starting-style]:translate-x-0 motion-reduce:transition-none" />
      </BaseSwitch.Root>
    </label>
  );
});

export { choiceIndicatorVariants, switchVariants };
