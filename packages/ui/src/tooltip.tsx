"use client";

import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import { cva } from "class-variance-authority";
import type { ReactElement, ReactNode } from "react";

const tooltipPopupVariants = cva(
  "max-w-64 origin-[var(--transform-origin)] rounded-control bg-foreground px-3 py-2 text-xs font-semibold leading-5 text-canvas shadow-panel outline-none transition-[transform,opacity] data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 motion-reduce:transition-none",
);

export interface TooltipProps
  extends Omit<BaseTooltip.Root.Props, "children"> {
  accessibleLabel: string;
  children: ReactElement;
  content: ReactNode;
}

export function Tooltip({
  accessibleLabel,
  children,
  content,
  ...properties
}: TooltipProps) {
  return (
    <BaseTooltip.Provider closeDelay={0} delay={0}>
      <BaseTooltip.Root {...properties}>
        <BaseTooltip.Trigger aria-label={accessibleLabel} render={children} />
        <BaseTooltip.Portal>
          <BaseTooltip.Positioner className="z-50" sideOffset={8}>
            <BaseTooltip.Popup className={tooltipPopupVariants()}>
              {content}
              <BaseTooltip.Arrow className="size-2 rotate-45 bg-foreground" />
            </BaseTooltip.Popup>
          </BaseTooltip.Positioner>
        </BaseTooltip.Portal>
      </BaseTooltip.Root>
    </BaseTooltip.Provider>
  );
}

export { tooltipPopupVariants };
