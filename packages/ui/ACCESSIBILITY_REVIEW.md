# Focused accessibility review

Reviewed on 2026-09-15 in headless and interactive Chromium on Windows. This
record covers the forms, overlays, navigation, feedback, data-display and
product-state foundations in the component catalog.

## Results

- **Keyboard:** passed. Every enabled form control is reachable in order;
  checkbox, radio, switch, select and menu operate from the keyboard. Dialog and
  Drawer close with Escape. Tabs use arrow-key activation, row actions remain in
  the tab order, and cursor navigation is exposed as ordinary named buttons.
- **Focus:** passed. Focus enters Dialog and Drawer, stays inside while open,
  remains visibly styled in both themes, and returns to the trigger on close.
- **Contrast:** passed for the reviewed stories. Storybook axe checks report no
  violations in light or dark themes, and the token test protects normal-text
  contrast on the primary accent.
- **Zoom and reflow:** passed at 200% text in the narrow Storybook viewport.
  Long labels, descriptions, overlay actions and tabular data remain readable
  without losing functionality; tables preserve access through contained
  horizontal scrolling when columns cannot reflow.
- **Reduced motion:** passed by inspection. The reduced-motion story disables
  non-essential transitions and loading animation through the shared semantic
  stylesheet.
- **Screen-reader semantics:** passed structurally. Tests verify computed names,
  label/description/error associations, invalid and busy states, supplementary
  tooltip naming, urgent toast announcements, labelled overlay regions, native
  table headings, current breadcrumb location, named tabs, indeterminate loading,
  alerts and read-only status announcements.

## Human release check

Before a production release, repeat the critical flows with one desktop screen
reader (NVDA or VoiceOver) and one mobile screen reader. Confirm reading order,
announcement wording and interruption behavior with real product copy. This is
an experiential release check; it complements, rather than replaces, the
automated role, name and live-region assertions in this package.
