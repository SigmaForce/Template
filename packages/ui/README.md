# UI design system

`@saas/ui` owns the application-facing component layer. Applications consume
semantic Tailwind utilities and components from this package; they do not import
Base UI primitives directly or depend on palette values.

## Replace the example brand

Edit [`src/brand.ts`](./src/brand.ts). The name, short mark, tagline, document
metadata and every AppShell brand surface read from this one object.

## Customize color and shape

Edit [`src/styles.css`](./src/styles.css) in two layers:

1. `--palette-*` variables are primitive values. They describe a physical color
   but carry no product meaning.
2. `--semantic-*` variables assign UI responsibilities for light, dark and
   system themes. Tailwind's `@theme inline` block exposes these as utilities
   such as `bg-surface`, `text-muted` and `border-border`.

Components may use semantic utilities only. Keep every theme complete and run
the accessibility smoke tests after changing colors.

## Build forms and interactions

Import application-facing components from `@saas/ui`; applications must not
import Base UI directly. The public facade includes:

- `Button`, `Link`, `Input`, `Textarea`, `Select`, `Checkbox`, `Radio`,
  `RadioGroup`, and `Switch` for forms;
- `FormField` for the visible label, description, invalid state, and error;
- `Dialog`, `Drawer`, and `Dropdown` for focus-managed overlays;
- `Tooltip`, `ToastProvider`, and `useToast` for supplementary help and
  announced feedback.

CVA `0.7.1` is the sole variant convention. Public variant functions are
exported for local composition, while Base UI stays behind the package facade.
Keep errors in text, not color alone. Tooltip content must remain supplementary
and its `accessibleLabel` must name the trigger without relying on the popup.
Mount one `ToastProvider` around the application area that produces feedback;
use `priority: "high"` only for urgent announcements.

## Develop components

Base UI is fixed at `1.8.0` and provides the unstyled accessible primitive
layer. Review accessibility and interaction behavior before upgrading it.

From the repository root:

```sh
corepack pnpm storybook
corepack pnpm storybook:build
corepack pnpm --filter @saas/ui test
corepack pnpm --filter @saas/ui test:storybook
corepack pnpm --filter @saas/ui test:visual
```

The catalog covers system/light/dark themes, narrow and wide navigation, 200%
text, reduced motion, form states, focus-managed overlays, keyboard interaction,
feedback, and extreme content. Storybook tests run in Chromium; the accessibility
addon treats violations as errors. Visual baselines cover light forms plus dark
overlay and feedback patterns. Review intentional changes before running
`corepack pnpm --filter @saas/ui test:visual:update`; baselines are
platform-specific by design.

The focused accessibility review and remaining human assistive-technology check
are recorded in [`ACCESSIBILITY_REVIEW.md`](./ACCESSIBILITY_REVIEW.md).
