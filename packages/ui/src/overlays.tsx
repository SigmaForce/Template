"use client";

import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { Drawer as BaseDrawer } from "@base-ui/react/drawer";
import { cva } from "class-variance-authority";
import type { ReactElement, ReactNode } from "react";
import { buttonVariants } from "./button";

const overlayBackdropVariants = cva(
  "fixed inset-0 z-40 bg-overlay opacity-100 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 motion-reduce:transition-none",
);

const overlayPanelVariants = cva(
  "border border-border bg-surface text-foreground shadow-panel outline-none transition-[transform,opacity] duration-200 motion-reduce:transition-none",
  {
    variants: {
      kind: {
        dialog:
          "w-[min(34rem,calc(100vw-2rem))] scale-100 rounded-panel p-6 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 sm:p-7",
        drawer:
          "h-full w-[min(32rem,calc(100vw-1rem))] translate-x-0 rounded-l-panel p-6 data-[ending-style]:translate-x-full data-[starting-style]:translate-x-full sm:p-7",
      },
    },
  },
);

interface OverlayContentProps {
  children: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  title: ReactNode;
  trigger: ReactElement;
}

export interface DialogProps
  extends OverlayContentProps,
    Omit<BaseDialog.Root.Props, "children"> {}

export function Dialog({
  children,
  description,
  footer,
  title,
  trigger,
  ...properties
}: DialogProps) {
  return (
    <BaseDialog.Root {...properties}>
      <BaseDialog.Trigger render={trigger} />
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className={overlayBackdropVariants()} />
        <BaseDialog.Viewport className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4">
          <BaseDialog.Popup className={overlayPanelVariants({ kind: "dialog" })}>
            <BaseDialog.Title className="text-xl font-black tracking-tight">
              {title}
            </BaseDialog.Title>
            {description ? (
              <BaseDialog.Description className="mt-2 text-sm leading-6 text-muted">
                {description}
              </BaseDialog.Description>
            ) : null}
            <div className="mt-6">{children}</div>
            <div className="mt-7 flex flex-wrap justify-end gap-3">
              {footer}
              <BaseDialog.Close
                className={buttonVariants({ size: "sm", variant: "secondary" })}
              >
                Close
              </BaseDialog.Close>
            </div>
          </BaseDialog.Popup>
        </BaseDialog.Viewport>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}

export interface DrawerProps
  extends OverlayContentProps,
    Omit<BaseDrawer.Root.Props, "children" | "swipeDirection"> {}

export function Drawer({
  children,
  description,
  footer,
  title,
  trigger,
  ...properties
}: DrawerProps) {
  return (
    <BaseDrawer.Root {...properties} swipeDirection="right">
      <BaseDrawer.Trigger render={trigger} />
      <BaseDrawer.Portal>
        <BaseDrawer.Backdrop className={overlayBackdropVariants()} />
        <BaseDrawer.Viewport className="fixed inset-0 z-50 flex justify-end pl-4">
          <BaseDrawer.Popup className={overlayPanelVariants({ kind: "drawer" })}>
            <BaseDrawer.Content className="flex h-full min-h-0 flex-col">
              <BaseDrawer.Title className="text-xl font-black tracking-tight">
                {title}
              </BaseDrawer.Title>
              {description ? (
                <BaseDrawer.Description className="mt-2 text-sm leading-6 text-muted">
                  {description}
                </BaseDrawer.Description>
              ) : null}
              <div className="mt-6 min-h-0 flex-1 overflow-y-auto">{children}</div>
              <div className="mt-7 flex flex-wrap justify-end gap-3 border-t border-border pt-5">
                {footer}
                <BaseDrawer.Close
                  className={buttonVariants({ size: "sm", variant: "secondary" })}
                >
                  Close
                </BaseDrawer.Close>
              </div>
            </BaseDrawer.Content>
          </BaseDrawer.Popup>
        </BaseDrawer.Viewport>
      </BaseDrawer.Portal>
    </BaseDrawer.Root>
  );
}

export { overlayBackdropVariants, overlayPanelVariants };
