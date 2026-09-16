import type { ReactNode } from "react";
import { brand } from "./brand";
import { MobileNavigation } from "./mobile-navigation";
import { NavigationList, type NavigationItem } from "./navigation-list";
import { ThemeSelect } from "./theme-select";

export type { NavigationItem } from "./navigation-list";

export interface AppShellProps {
  account?: ReactNode;
  children: ReactNode;
  navigation?: NavigationItem[];
  organization?: ReactNode;
}

const defaultNavigation: NavigationItem[] = [
  { href: "#overview", label: "Overview" },
  { href: "#activity", label: "Activity" },
  { href: "#billing", label: "Billing" },
  { href: "#settings", label: "Settings" },
];

function BrandLink() {
  return (
    <a
      className="inline-flex items-center gap-3 rounded-control"
      href="/"
      aria-label={`${brand.name} home`}
    >
      <span
        className="grid size-9 place-items-center rounded-mark bg-accent text-sm font-black text-accent-contrast shadow-mark"
        aria-hidden="true"
      >
        {brand.shortName}
      </span>
      <span className="hidden text-lg font-extrabold tracking-tight text-foreground sm:inline">
        {brand.name}
      </span>
    </a>
  );
}

function PrimaryNavigation({ navigation }: { navigation: NavigationItem[] }) {
  return (
    <nav aria-label="Primary navigation" className="hidden flex-1 md:block">
      <NavigationList items={navigation} variant="desktop" />
    </nav>
  );
}

export function AppShell({
  account,
  children,
  navigation = defaultNavigation,
  organization,
}: AppShellProps) {
  return (
    <div className="min-h-dvh bg-canvas text-foreground">
      <a
        className="fixed left-4 top-4 z-50 -translate-y-24 rounded-control bg-foreground px-4 py-2 text-sm font-bold text-canvas shadow-panel transition-transform focus:translate-y-0 focus:outline-2 focus:outline-offset-2 focus:outline-focus"
        href="#main-content"
      >
        Skip to content
      </a>

      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-surface px-5 py-6 md:flex">
        <BrandLink />
        <div className="mt-10 flex min-h-0 flex-1 flex-col">
          <PrimaryNavigation navigation={navigation} />
        </div>
        <p className="text-xs leading-5 text-subtle">{brand.tagline}</p>
      </aside>

      <div className="md:pl-64">
        <header className="sticky top-0 z-30 flex min-h-16 flex-wrap items-center justify-between gap-2 border-b border-border bg-canvas/90 px-4 py-2 backdrop-blur-xl md:px-8">
          <div className="flex items-center gap-2 md:hidden">
            <MobileNavigation navigation={navigation} />
            <BrandLink />
          </div>
          <div className="order-3 w-full text-sm font-semibold text-muted md:order-none md:w-auto">
            {organization ?? brand.organizationName}
          </div>
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <ThemeSelect />
            {account ?? (
              <div
                className="grid size-9 place-items-center rounded-full bg-accent-soft text-xs font-black text-accent-strong"
                aria-label="Signed in as Alex Morgan"
              >
                AM
              </div>
            )}
          </div>
        </header>

        <main id="main-content" tabIndex={-1} className="min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
