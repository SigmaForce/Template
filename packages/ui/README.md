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

## Develop components

Base UI is fixed at `1.8.0` and provides the unstyled accessible primitive
layer. Review accessibility and interaction behavior before upgrading it.

From the repository root:

```sh
corepack pnpm storybook
corepack pnpm storybook:build
```

The AppShell stories cover system/light/dark themes, narrow and wide navigation,
200% text, and reduced motion. The accessibility addon treats violations as
errors.
