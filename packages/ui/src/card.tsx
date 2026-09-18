"use client";

import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "./utils";

export interface CardProps extends Omit<ComponentProps<"section">, "title"> {
  actions?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  title: ReactNode;
}

export function Card({
  actions,
  children,
  className,
  description,
  footer,
  title,
  ...properties
}: CardProps) {
  const titleId = useId();

  return (
    <section
      {...properties}
      aria-labelledby={titleId}
      className={cn(
        "rounded-panel border border-border bg-surface p-5 text-foreground shadow-sm sm:p-6",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-black tracking-tight" id={titleId}>
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      <div className="mt-5">{children}</div>
      {footer ? (
        <div className="mt-5 border-t border-border pt-4 text-sm text-muted">
          {footer}
        </div>
      ) : null}
    </section>
  );
}
