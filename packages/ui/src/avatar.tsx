"use client";

import { Avatar as BaseAvatar } from "@base-ui/react/avatar";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

export const avatarVariants = cva(
  "relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-accent-soft font-black text-accent-strong",
  {
    variants: {
      size: {
        sm: "size-8 text-xs",
        md: "size-10 text-sm",
        lg: "size-12 text-base",
      },
    },
    defaultVariants: { size: "md" },
  },
);

export interface AvatarProps extends VariantProps<typeof avatarVariants> {
  className?: string;
  fallback: string;
  name: string;
  src?: string;
}

export function Avatar({ className, fallback, name, size, src }: AvatarProps) {
  return (
    <BaseAvatar.Root
      aria-label={name}
      className={cn(avatarVariants({ size }), className)}
      role="img"
    >
      <BaseAvatar.Fallback aria-hidden="true">{fallback}</BaseAvatar.Fallback>
      {src ? (
        <BaseAvatar.Image
          alt=""
          className="absolute inset-0 size-full object-cover data-[error]:invisible data-[loading]:invisible"
          src={src}
        />
      ) : null}
    </BaseAvatar.Root>
  );
}
