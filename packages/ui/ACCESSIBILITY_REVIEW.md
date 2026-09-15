# Focused accessibility review

Reviewed on 2026-09-15 in headless and interactive Chromium on Windows. This
record covers the forms, overlays, navigation and feedback foundations in the
component catalog.

## Results

- **Keyboard:** passed. Every enabled form control is reachable in order;
  checkbox, radio, switch, select and menu operate from the keyboard. Dialog and
  Drawer close with Escape.
- **Focus:** passed. Focus enters Dialog and Drawer, stays inside while open,
  remains visibly styled in both themes, and returns to the trigger on close.
- **Contrast:** passed for the reviewed stories. Storybook axe checks report no
  violations in light or dark themes, and the token test protects normal-text
  contrast on the primary accent.
- **Zoom and reflow:** passed at 200% text in the narrow Storybook viewport.
  Long labels, descriptions and overlay actions remain readable without losing
  functionality.
- **Reduced motion:** passed by inspection. The reduced-motion story disables
  non-essential transitions and loading animation through the shared semantic
  stylesheet.
- **Screen-reader semantics:** passed structurally. Tests verify computed names,
  label/description/error associations, invalid and busy states, supplementary
  tooltip naming, urgent toast announcements and labelled overlay regions.

## Human release check

Before a production release, repeat the critical flows with one desktop screen
reader (NVDA or VoiceOver) and one mobile screen reader. Confirm reading order,
announcement wording and interruption behavior with real product copy. This is
an experiential release check; it complements, rather than replaces, the
automated role, name and live-region assertions in this package.
