"use client";

import { Dialog } from "@base-ui/react/dialog";
import { brand } from "./brand";
import { NavigationList, type NavigationItem } from "./navigation-list";

export function MobileNavigation({ navigation }: { navigation: NavigationItem[] }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger className="grid size-10 place-items-center rounded-control border border-border bg-surface text-foreground shadow-sm outline-none transition-colors hover:bg-surface-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus md:hidden">
        <span className="sr-only">Open navigation</span>
        <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 18 18" width="18">
          <path d="M2.5 5h13M2.5 9h13M2.5 13h13" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
        </svg>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-overlay opacity-100 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 motion-reduce:transition-none" />
        <Dialog.Viewport className="fixed inset-0 z-50 flex items-stretch justify-start p-3">
          <Dialog.Popup className="flex w-[min(21rem,calc(100vw-1.5rem))] -translate-x-0 flex-col rounded-panel border border-border bg-surface p-5 text-foreground shadow-panel outline-none transition duration-200 data-[ending-style]:-translate-x-[110%] data-[starting-style]:-translate-x-[110%] motion-reduce:transition-none">
            <div className="flex items-center justify-between gap-4">
              <Dialog.Title className="flex items-center gap-3 text-lg font-extrabold tracking-tight">
                <span className="grid size-9 place-items-center rounded-mark bg-accent text-sm font-black text-accent-contrast shadow-mark" aria-hidden="true">
                  {brand.shortName}
                </span>
                Navigation
              </Dialog.Title>
              <Dialog.Close className="grid size-10 place-items-center rounded-control text-muted outline-none transition-colors hover:bg-surface-strong hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
                <span className="sr-only">Close navigation</span>
                <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 18 18" width="18">
                  <path d="m4 4 10 10M14 4 4 14" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
                </svg>
              </Dialog.Close>
            </div>
            <Dialog.Description className="mt-3 text-sm leading-6 text-muted">
              Move between the main areas of {brand.name}.
            </Dialog.Description>

            <nav aria-label="Mobile navigation" className="mt-8">
              <NavigationList items={navigation} variant="mobile" />
            </nav>

            <p className="mt-auto border-t border-border pt-5 text-xs leading-5 text-subtle">
              {brand.tagline}
            </p>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
