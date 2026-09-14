# Own the design-system component layer

The foundation owns its visual component code in `packages/ui`, using Tailwind CSS, semantic CSS-variable tokens, shadcn conventions, and an explicitly fixed Base UI primitive layer. This favors unrestricted local customization and stable application-facing wrappers over automatic component-library upgrades, so primitive and shadcn updates must be reviewed against the foundation's accessibility and visual-regression contract.
