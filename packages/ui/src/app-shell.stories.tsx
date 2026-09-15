import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AppShell } from "./app-shell";

function ExampleDashboard() {
  return (
    <div className="mx-auto grid max-w-6xl gap-6 p-5 sm:p-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
      <section className="rounded-panel border border-border bg-surface p-6 shadow-panel sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-accent-strong">
          Monday, September 15
        </p>
        <h1 className="mt-4 max-w-xl text-4xl font-black tracking-[-0.045em] text-foreground sm:text-5xl">
          Keep the important work in view.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-muted">
          Your team completed 18 priorities this week. Three decisions need your attention next.
        </p>
        <button className="mt-8 min-h-11 rounded-control bg-accent px-5 text-sm font-black text-accent-contrast outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
          Review priorities
        </button>
      </section>

      <aside className="rounded-panel border border-border bg-surface-strong p-6" aria-label="Weekly pulse">
        <p className="text-sm font-bold text-muted">Weekly pulse</p>
        <p className="mt-3 text-5xl font-black tracking-[-0.05em] text-foreground">84%</p>
        <p className="mt-2 text-sm leading-6 text-muted">Goals moving forward across all active teams.</p>
      </aside>
    </div>
  );
}

const meta = {
  args: { children: null },
  component: AppShell,
  parameters: {
    docs: {
      description: {
        component: "Responsive application frame composed only from semantic design tokens.",
      },
    },
  },
  render: () => (
    <AppShell>
      <ExampleDashboard />
    </AppShell>
  ),
  title: "Foundations/AppShell",
} satisfies Meta<typeof AppShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SystemTheme: Story = {};

export const LightTheme: Story = {
  globals: { theme: "light" },
};

export const DarkTheme: Story = {
  globals: { theme: "dark" },
};

export const NarrowNavigation: Story = {
  globals: { viewport: { isRotated: false, value: "mobile1" } },
};

export const WideNavigation: Story = {
  globals: { viewport: { isRotated: false, value: "desktop" } },
};

export const ExpandedText: Story = {
  globals: {
    textScale: "expanded",
    viewport: { isRotated: false, value: "mobile2" },
  },
};

export const ReducedMotion: Story = {
  globals: { motion: "reduced" },
};
