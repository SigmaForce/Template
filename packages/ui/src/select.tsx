"use client";

import { Select as BaseSelect } from "@base-ui/react/select";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

const selectTriggerVariants = cva(
  "flex w-full items-center justify-between gap-3 rounded-control border border-border bg-surface text-left text-foreground outline-none transition-[border-color,box-shadow] hover:border-muted focus-visible:border-focus focus-visible:ring-2 focus-visible:ring-focus/25 data-[disabled]:cursor-not-allowed data-[disabled]:bg-surface-strong data-[disabled]:text-subtle data-[invalid]:border-negative data-[invalid]:ring-2 data-[invalid]:ring-negative/20",
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

export interface SelectOption {
  disabled?: boolean;
  label: string;
  value: string;
}

export interface SelectProps extends VariantProps<
  typeof selectTriggerVariants
> {
  className?: string;
  defaultValue?: string | null;
  disabled?: boolean;
  label: string;
  invalid?: boolean;
  name?: string;
  onValueChange?: (value: string | null) => void;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  value?: string | null;
}

export function Select({
  className,
  defaultValue,
  disabled,
  invalid,
  label,
  name,
  onValueChange,
  options,
  placeholder = "Select an option",
  required,
  size,
  value,
}: SelectProps) {
  return (
    <BaseSelect.Root
      defaultValue={defaultValue}
      disabled={disabled}
      items={options}
      name={name}
      onValueChange={onValueChange}
      required={required}
      value={value}
    >
      <BaseSelect.Trigger
        aria-invalid={invalid || undefined}
        aria-label={label}
        className={cn(selectTriggerVariants({ size }), className)}
      >
        <BaseSelect.Value placeholder={placeholder} />
        <BaseSelect.Icon className="text-muted" aria-hidden="true">
          ⌄
        </BaseSelect.Icon>
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner align="start" className="z-50" sideOffset={6}>
          <BaseSelect.Popup className="min-w-[var(--anchor-width)] origin-[var(--transform-origin)] rounded-control border border-border bg-surface p-1 text-foreground shadow-panel outline-none transition-[transform,opacity] data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 motion-reduce:transition-none">
            <BaseSelect.List>
              {options.map((option) => (
                <BaseSelect.Item
                  className="flex min-h-10 cursor-default items-center justify-between gap-3 rounded-control px-3 text-sm outline-none data-[disabled]:opacity-45 data-[highlighted]:bg-accent-soft data-[highlighted]:text-accent-strong"
                  disabled={option.disabled}
                  key={option.value}
                  value={option.value}
                >
                  <BaseSelect.ItemText>{option.label}</BaseSelect.ItemText>
                  <BaseSelect.ItemIndicator aria-hidden="true">
                    ✓
                  </BaseSelect.ItemIndicator>
                </BaseSelect.Item>
              ))}
            </BaseSelect.List>
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
}

export { selectTriggerVariants };
