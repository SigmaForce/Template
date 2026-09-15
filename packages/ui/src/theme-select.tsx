"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

const subscribe = () => () => undefined;

export function ThemeSelect() {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const { setTheme, theme } = useTheme();

  return (
    <label className="relative">
      <span className="sr-only">Color theme</span>
      <select
        aria-label="Color theme"
        className="min-h-10 appearance-none rounded-control border border-border bg-surface py-2 pl-3 pr-8 text-xs font-bold text-muted shadow-sm outline-none transition-colors hover:bg-surface-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-60"
        disabled={!mounted}
        onChange={(event) => setTheme(event.currentTarget.value)}
        value={mounted ? (theme ?? "system") : "system"}
      >
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-subtle" aria-hidden="true">
        ▾
      </span>
    </label>
  );
}
