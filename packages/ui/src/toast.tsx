"use client";

import { Toast as BaseToast } from "@base-ui/react/toast";
import { cva } from "class-variance-authority";
import type { ReactNode } from "react";

const toastVariants = cva(
  "w-[min(24rem,calc(100vw-2rem))] rounded-panel border bg-surface p-4 text-foreground shadow-panel outline-none transition-[transform,opacity] data-[ending-style]:translate-x-4 data-[ending-style]:opacity-0 data-[starting-style]:translate-x-4 data-[starting-style]:opacity-0 motion-reduce:transition-none",
  {
    variants: {
      tone: {
        default: "border-border",
        error: "border-negative",
        success: "border-positive",
      },
    },
    defaultVariants: { tone: "default" },
  },
);

export interface ToastProviderProps {
  children: ReactNode;
  limit?: number;
  timeout?: number;
}

export function useToast() {
  return BaseToast.useToastManager();
}

function ToastList() {
  const { toasts } = BaseToast.useToastManager();

  return toasts.map((toast) => {
    const tone =
      toast.type === "error"
        ? "error"
        : toast.type === "success"
          ? "success"
          : "default";

    return (
      <BaseToast.Root
        className={toastVariants({ tone })}
        data-slot="toast"
        key={toast.id}
        toast={toast}
      >
        <BaseToast.Content className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <BaseToast.Title className="text-sm font-black" />
            <BaseToast.Description className="mt-1 text-sm leading-5 text-muted" />
          </div>
          {toast.actionProps ? (
            <BaseToast.Action className="rounded-control px-2 py-1 text-sm font-bold text-accent-strong outline-none focus-visible:ring-2 focus-visible:ring-focus" />
          ) : null}
          <BaseToast.Close
            aria-label="Dismiss notification"
            className="grid size-8 shrink-0 place-items-center rounded-control text-muted outline-none hover:bg-surface-strong hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
          >
            <span aria-hidden="true">×</span>
          </BaseToast.Close>
        </BaseToast.Content>
      </BaseToast.Root>
    );
  });
}

export function ToastProvider({
  children,
  limit = 3,
  timeout = 5_000,
}: ToastProviderProps) {
  return (
    <BaseToast.Provider limit={limit} timeout={timeout}>
      {children}
      <BaseToast.Portal>
        <BaseToast.Viewport
          className="fixed right-4 top-4 z-[60] flex max-h-[calc(100dvh-2rem)] flex-col gap-3 outline-none"
          aria-label="Notifications"
        >
          <ToastList />
        </BaseToast.Viewport>
      </BaseToast.Portal>
    </BaseToast.Provider>
  );
}

export { toastVariants };
