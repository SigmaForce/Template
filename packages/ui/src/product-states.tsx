"use client";

import { Progress as BaseProgress } from "@base-ui/react/progress";
import { cva, type VariantProps } from "class-variance-authority";
import { useId, type ReactNode } from "react";
import { cn } from "./utils";

export const productStateVariants = cva(
  "rounded-panel border p-6 text-center sm:p-8",
  {
    variants: {
      tone: {
        accent: "border-accent/30 bg-accent-soft text-foreground",
        negative: "border-negative/30 bg-negative/10 text-foreground",
        neutral: "border-border bg-surface text-foreground",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

interface StateFrameProps extends VariantProps<typeof productStateVariants> {
  action?: ReactNode;
  className?: string;
  description: ReactNode;
  icon: ReactNode;
  role?: "alert" | "region" | "status";
  title: ReactNode;
}

function StateFrame({
  action,
  className,
  description,
  icon,
  role = "region",
  title,
  tone,
}: StateFrameProps) {
  const titleId = useId();

  return (
    <section
      aria-labelledby={titleId}
      className={cn(productStateVariants({ tone }), className)}
      role={role}
    >
      <span
        aria-hidden="true"
        className="mx-auto grid size-10 place-items-center rounded-full bg-surface-strong text-lg font-black text-accent-strong"
      >
        {icon}
      </span>
      <h2 className="mt-4 text-lg font-black tracking-tight" id={titleId}>
        {title}
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted">
        {description}
      </p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </section>
  );
}

export interface LoadingStateProps {
  className?: string;
  description?: ReactNode;
  label?: ReactNode;
}

export function LoadingState({
  className,
  description,
  label = "Loading",
}: LoadingStateProps) {
  return (
    <BaseProgress.Root
      className={cn(productStateVariants({ tone: "neutral" }), className)}
      value={null}
    >
      <BaseProgress.Label className="text-lg font-black tracking-tight">
        {label}
      </BaseProgress.Label>
      {description ? (
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted">
          {description}
        </p>
      ) : null}
      <BaseProgress.Track className="mx-auto mt-5 h-2 max-w-sm overflow-hidden rounded-full bg-surface-strong">
        <BaseProgress.Indicator className="h-full w-1/3 animate-pulse rounded-full bg-accent motion-reduce:animate-none" />
      </BaseProgress.Track>
    </BaseProgress.Root>
  );
}

export interface ProductStateProps {
  action?: ReactNode;
  className?: string;
  description: ReactNode;
  title?: ReactNode;
}

export type EmptyStateProps = ProductStateProps;

export function EmptyState({
  action,
  className,
  description,
  title = "Nothing here yet",
}: EmptyStateProps) {
  return (
    <StateFrame
      action={action}
      className={className}
      description={description}
      icon="–"
      title={title}
    />
  );
}

export type ErrorStateProps = ProductStateProps;

export function ErrorState({
  action,
  className,
  description,
  title = "Something went wrong",
}: ErrorStateProps) {
  return (
    <StateFrame
      action={action}
      className={className}
      description={description}
      icon="!"
      role="alert"
      title={title}
      tone="negative"
    />
  );
}

export type ForbiddenStateProps = ProductStateProps;

export function ForbiddenState({
  action,
  className,
  description,
  title = "Access unavailable",
}: ForbiddenStateProps) {
  return (
    <StateFrame
      action={action}
      className={className}
      description={description}
      icon="×"
      title={title}
      tone="accent"
    />
  );
}

export type ReadOnlyStateProps = ProductStateProps;

export function ReadOnlyState({
  action,
  className,
  description,
  title = "Read-only Organization",
}: ReadOnlyStateProps) {
  return (
    <StateFrame
      action={action}
      className={className}
      description={description}
      icon="i"
      role="status"
      title={title}
      tone="accent"
    />
  );
}
